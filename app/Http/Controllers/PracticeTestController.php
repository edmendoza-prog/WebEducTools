<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PracticeTestController extends Controller
{
    /**
     * Get all practice tests for the authenticated teacher
     */
    public function index(): JsonResponse
    {
        try {
            $teacherId = auth()->id();

            $practiceTests = DB::table('practice_tests')
                ->where('teacher_id', $teacherId)
                ->orderBy('updated_at', 'desc')
                ->get()
                ->map(function ($test) {
                    return [
                        'id' => $test->id,
                        'title' => $test->title,
                        'subject' => $test->subject,
                        'className' => $test->class_name,
                        'questions' => DB::table('practice_test_questions')
                            ->where('practice_test_id', $test->id)
                            ->count(),
                        'duration' => $test->duration,
                        'updatedAt' => date('M d, Y', strtotime($test->updated_at)),
                    ];
                });

            return response()->json(['practiceTests' => $practiceTests]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch practice tests: ' . $e->getMessage());
            return response()->json(['practiceTests' => []]);
        }
    }

    /**
     * Store a new practice test
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'subject' => 'required|string|max:255',
                'className' => 'nullable|string|max:255',
                'duration' => 'required|integer|min:1',
                'instructions' => 'nullable|string',
                'questions' => 'required|array|min:1',
            ]);

            $teacherId = auth()->id();

            // Create practice test
            $testId = DB::table('practice_tests')->insertGetId([
                'teacher_id' => $teacherId,
                'title' => $validated['title'],
                'subject' => $validated['subject'],
                'class_name' => $validated['className'] ?? null,
                'duration' => $validated['duration'],
                'instructions' => $validated['instructions'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Store questions
            foreach ($validated['questions'] as $index => $question) {
                $questionData = [
                    'practice_test_id' => $testId,
                    'question_type' => $question['type'],
                    'question_text' => $question['question'],
                    'points' => $question['points'],
                    'order_number' => $index + 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if ($question['type'] === 'multiple_choice') {
                    $questionData['options'] = json_encode($question['options']);
                    $questionData['correct_answer'] = json_encode(['index' => $question['correctAnswer']]);
                } elseif ($question['type'] === 'true_false') {
                    $questionData['correct_answer'] = json_encode(['value' => $question['correctAnswer']]);
                } elseif ($question['type'] === 'identification') {
                    $questionData['correct_answer'] = json_encode(['text' => $question['correctAnswer']]);
                }

                DB::table('practice_test_questions')->insert($questionData);
            }

            // Notify students in the assigned class
            if (!empty($validated['className'])) {
                $class = DB::table('classes')
                    ->where('name', $validated['className'])
                    ->where('teacher_id', $teacherId)
                    ->first();
                
                if ($class) {
                    $studentIds = DB::table('class_students')
                        ->where('class_id', $class->id)
                        ->pluck('student_id');
                    
                    foreach ($studentIds as $studentId) {
                        DB::table('notifications')->insert([
                            'user_id' => $studentId,
                            'created_by' => $teacherId,
                            'type' => 'practice_test_assigned',
                            'title' => 'New practice test available',
                            'message' => 'Your teacher has uploaded "'.$validated['title'].'" for '.$validated['subject'].'.',
                            'payload' => json_encode([
                                'practice_test_id' => $testId,
                                'subject' => $validated['subject'],
                            ]),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Practice test created successfully',
                'testId' => $testId,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Failed to create practice test: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create practice test',
            ], 500);
        }
    }

    /**
     * Generate questions using AI from uploaded file or text
     */
    public function generateQuestions(Request $request): JsonResponse
    {
        try {
            // Handle both old single type and new multiple types format
            $questionTypesInput = $request->input('questionTypes');
            if ($questionTypesInput) {
                // New format: JSON array of types
                $questionTypes = json_decode($questionTypesInput, true);
                if (!is_array($questionTypes)) {
                    $questionTypes = [$questionTypesInput];
                }
            } else {
                // Fallback to old format for backward compatibility
                $singleType = $request->input('questionType', 'multiple_choice');
                $questionTypes = [$singleType];
            }

            $source = $request->input('source');
            $totalQuestionCount = (int) $request->input('questionCount', 5);

            // Limit to prevent abuse
            $totalQuestionCount = min(max($totalQuestionCount, 1), 50);

            // Extract content based on source
            $content = '';
            
            if ($source === 'pdf' || $source === 'powerpoint') {
                if (!$request->hasFile('file')) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No file uploaded',
                    ], 400);
                }

                $file = $request->file('file');
                
                // TODO: Implement actual file parsing
                // For PDF: Use libraries like Smalot\PdfParser
                // For PowerPoint: Use PHPPresentation or similar
                // For now, we'll return a sample response
                
                $content = $this->extractFileContent($file);
            } elseif ($source === 'text') {
                $content = $request->input('text');
            }

            if (empty($content)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No content to generate questions from',
                ], 400);
            }

            // Distribute questions across selected types
            $allQuestions = [];
            $typesCount = count($questionTypes);
            $questionsPerType = (int) floor($totalQuestionCount / $typesCount);
            $remainingQuestions = $totalQuestionCount % $typesCount;

            foreach ($questionTypes as $index => $questionType) {
                // Add one extra question to first types if there's a remainder
                $countForThisType = $questionsPerType + ($index < $remainingQuestions ? 1 : 0);
                
                if ($countForThisType > 0) {
                    $questions = $this->generateQuestionsFromContent($content, $questionType, $countForThisType);
                    $allQuestions = array_merge($allQuestions, $questions);
                }
            }

            return response()->json([
                'success' => true,
                'questions' => $allQuestions,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to generate questions: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate questions',
            ], 500);
        }
    }

    /**
     * Extract content from uploaded file (PDF or PowerPoint)
     */
    /**
     * Extract content from uploaded file
     * TODO: Implement actual file parsing
     */
    private function extractFileContent($file): string
    {
        // This is a placeholder. In production, you would:
        // 1. Use Smalot\PdfParser\Parser for PDF files
        // 2. Use PHPPresentation for PowerPoint files
        // 3. Extract and clean the text content
        
        return "Sample content extracted from " . $file->getClientOriginalName();
    }

    /**
     * Generate questions from content using AI
     * TODO: Integrate with OpenAI API
     */
    private function generateQuestionsFromContent(string $content, string $questionType, int $questionCount): array
    {
        // This is a placeholder. In production, you would:
        // 1. Call OpenAI API with appropriate prompts
        // 2. Parse the AI response
        // 3. Format questions according to type
        
        // For demonstration, generate questions that reference the actual content
        $sampleQuestions = [];
        
        // Extract some words/phrases from content for more realistic questions
        $words = explode(' ', $content);
        $contentPreview = implode(' ', array_slice($words, 0, min(10, count($words))));
        
        for ($i = 0; $i < $questionCount; $i++) {
            $id = 'gen-' . time() . '-' . $i . '-' . rand(1000, 9999);
            
            if ($questionType === 'multiple_choice') {
                $sampleQuestions[] = [
                    'id' => $id,
                    'type' => 'multiple_choice',
                    'question' => 'Based on the provided content, which of the following statements is most accurate? (Question ' . ($i + 1) . ')',
                    'options' => [
                        'The content discusses key concepts and fundamental principles',
                        'The material focuses on practical applications and examples',
                        'The text emphasizes theoretical frameworks and analysis',
                        'The document covers historical context and development',
                    ],
                    'correctAnswer' => rand(0, 3),
                    'points' => 2,
                ];
            } elseif ($questionType === 'true_false') {
                $statements = [
                    'The main topic discussed in the content is related to foundational concepts',
                    'The material provides detailed examples to support the main ideas',
                    'The content emphasizes practical implementation over theory',
                    'The text includes multiple perspectives on the subject matter',
                    'The document presents information in a chronological order',
                ];
                
                $sampleQuestions[] = [
                    'id' => $id,
                    'type' => 'true_false',
                    'question' => $statements[$i % count($statements)] . ' (Question ' . ($i + 1) . ')',
                    'correctAnswer' => (bool)rand(0, 1),
                    'points' => 1,
                ];
            } elseif ($questionType === 'identification') {
                $prompts = [
                    'What is the primary concept or term discussed in the content?',
                    'Identify the key methodology or approach mentioned in the material.',
                    'What is the main objective or goal stated in the text?',
                    'Name the central theme or subject covered in the document.',
                    'What is the critical term defined or explained in the content?',
                ];
                
                $sampleQuestions[] = [
                    'id' => $id,
                    'type' => 'identification',
                    'question' => $prompts[$i % count($prompts)] . ' (Question ' . ($i + 1) . ')',
                    'correctAnswer' => 'Key Concept from Content',
                    'points' => 2,
                ];
            }
        }
        
        return $sampleQuestions;
    }

    /**
     * Delete a practice test
     */
    public function destroy($id): JsonResponse
    {
        try {
            $teacherId = auth()->id();

            $test = DB::table('practice_tests')
                ->where('id', $id)
                ->where('teacher_id', $teacherId)
                ->first();

            if (!$test) {
                return response()->json([
                    'success' => false,
                    'message' => 'Practice test not found',
                ], 404);
            }

            // Delete questions first
            DB::table('practice_test_questions')
                ->where('practice_test_id', $id)
                ->delete();

            // Delete test
            DB::table('practice_tests')
                ->where('id', $id)
                ->delete();

            return response()->json([
                'success' => true,
                'message' => 'Practice test deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete practice test: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete practice test',
            ], 500);
        }
    }

    /**
     * Get practice test details for teacher (view/edit)
     */
    public function show($id): JsonResponse
    {
        try {
            $teacherId = auth()->id();

            $test = DB::table('practice_tests')
                ->where('id', $id)
                ->where('teacher_id', $teacherId)
                ->first();

            if (!$test) {
                return response()->json([
                    'success' => false,
                    'message' => 'Practice test not found',
                ], 404);
            }

            // Get questions
            $questions = DB::table('practice_test_questions')
                ->where('practice_test_id', $id)
                ->orderBy('order_number')
                ->get()
                ->map(function ($q) {
                    $data = [
                        'id' => (string) $q->id,
                        'type' => $q->question_type,
                        'question' => $q->question_text,
                        'points' => (int) $q->points,
                    ];

                    if ($q->question_type === 'multiple_choice') {
                        $options = json_decode($q->options, true);
                        $data['options'] = $options;
                        $data['correctAnswer'] = (int) $q->correct_answer;
                    } elseif ($q->question_type === 'true_false') {
                        $data['correctAnswer'] = (bool) $q->correct_answer;
                    } elseif ($q->question_type === 'identification') {
                        $data['correctAnswer'] = $q->correct_answer;
                    }

                    return $data;
                });

            return response()->json([
                'success' => true,
                'test' => [
                    'id' => $test->id,
                    'title' => $test->title,
                    'subject' => $test->subject,
                    'className' => $test->class_name,
                    'duration' => (int) $test->duration,
                    'instructions' => $test->instructions,
                    'questions' => $questions,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get practice test: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load practice test',
            ], 500);
        }
    }

    /**
     * Update a practice test
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $teacherId = auth()->id();

            $test = DB::table('practice_tests')
                ->where('id', $id)
                ->where('teacher_id', $teacherId)
                ->first();

            if (!$test) {
                return response()->json([
                    'success' => false,
                    'message' => 'Practice test not found',
                ], 404);
            }

            $validated = $request->validate([
                'title' => 'required|string|max:255',
                'subject' => 'required|string|max:100',
                'className' => 'nullable|string|max:100',
                'duration' => 'required|integer|min:1',
                'instructions' => 'nullable|string',
                'questions' => 'required|array|min:1',
            ]);

            // Update test
            DB::table('practice_tests')
                ->where('id', $id)
                ->update([
                    'title' => $validated['title'],
                    'subject' => $validated['subject'],
                    'class_name' => $validated['className'] ?? null,
                    'duration' => $validated['duration'],
                    'instructions' => $validated['instructions'] ?? '',
                    'updated_at' => now(),
                ]);

            // Delete old questions
            DB::table('practice_test_questions')
                ->where('practice_test_id', $id)
                ->delete();

            // Insert new questions
            $orderNumber = 1;
            foreach ($validated['questions'] as $question) {
                $questionData = [
                    'practice_test_id' => $id,
                    'question_type' => $question['type'],
                    'question_text' => $question['question'],
                    'points' => $question['points'] ?? 1,
                    'order_number' => $orderNumber++,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if ($question['type'] === 'multiple_choice') {
                    $questionData['options'] = json_encode($question['options']);
                    $questionData['correct_answer'] = (string) $question['correctAnswer'];
                } elseif ($question['type'] === 'true_false') {
                    $questionData['correct_answer'] = $question['correctAnswer'] ? '1' : '0';
                } elseif ($question['type'] === 'identification') {
                    $questionData['correct_answer'] = $question['correctAnswer'];
                }

                DB::table('practice_test_questions')->insert($questionData);
            }

            return response()->json([
                'success' => true,
                'message' => 'Practice test updated successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update practice test: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update practice test',
            ], 500);
        }
    }

    /**
     * Get practice tests for students
     */
    public function studentIndex(): JsonResponse
    {
        try {
            $studentId = auth()->id();

            // Get classes the student is enrolled in
            $classIds = DB::table('class_students')
                ->where('student_id', $studentId)
                ->pluck('class_id');

            if ($classIds->isEmpty()) {
                return response()->json(['practiceTests' => []]);
            }

            // Get practice tests for those classes
            $practiceTests = DB::table('practice_tests')
                ->join('classes', 'practice_tests.class_name', '=', 'classes.name')
                ->whereIn('classes.id', $classIds)
                ->select('practice_tests.*')
                ->get();

            // Check student's completion status
            $results = $practiceTests->map(function ($test) use ($studentId) {
                $attempt = DB::table('practice_test_attempts')
                    ->where('practice_test_id', $test->id)
                    ->where('student_id', $studentId)
                    ->first();

                return [
                    'id' => $test->id,
                    'title' => $test->title,
                    'subject' => $test->subject,
                    'className' => $test->class_name,
                    'questions' => DB::table('practice_test_questions')
                        ->where('practice_test_id', $test->id)
                        ->count(),
                    'duration' => $test->duration,
                    'instructions' => $test->instructions,
                    'status' => $attempt ? 'completed' : 'not_started',
                    'score' => $attempt ? $attempt->score_percentage : null,
                    'completedAt' => $attempt ? date('M d, Y', strtotime($attempt->completed_at)) : null,
                ];
            });

            return response()->json(['practiceTests' => $results]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch student practice tests: ' . $e->getMessage());
            return response()->json(['practiceTests' => []]);
        }
    }

    /**
     * Get a specific practice test for taking
     */
    public function getTest($id): JsonResponse
    {
        try {
            $studentId = auth()->id();

            $test = DB::table('practice_tests')->find($id);

            if (!$test) {
                return response()->json(['message' => 'Test not found'], 404);
            }

            // Check if already completed
            $attempt = DB::table('practice_test_attempts')
                ->where('practice_test_id', $id)
                ->where('student_id', $studentId)
                ->first();

            if ($attempt) {
                return response()->json(['message' => 'Test already completed'], 403);
            }

            // Get questions
            $questions = DB::table('practice_test_questions')
                ->where('practice_test_id', $id)
                ->orderBy('order_number')
                ->get()
                ->map(function ($q) {
                    $data = [
                        'id' => $q->id,
                        'type' => $q->question_type,
                        'questionText' => $q->question_text,
                        'points' => $q->points,
                        'orderNumber' => $q->order_number,
                    ];

                    if ($q->question_type === 'multiple_choice') {
                        $data['options'] = json_decode($q->options);
                    }

                    return $data;
                });

            return response()->json([
                'id' => $test->id,
                'title' => $test->title,
                'subject' => $test->subject,
                'duration' => $test->duration,
                'instructions' => $test->instructions,
                'questions' => $questions,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get practice test: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to load test'], 500);
        }
    }

    /**
     * Submit practice test answers
     */
    public function submitTest(Request $request, $id): JsonResponse
    {
        try {
            $studentId = auth()->id();
            $answers = $request->input('answers', []);
            
            // Ensure answers is an array
            if (!is_array($answers)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid answers format',
                ], 400);
            }

            // Get test questions
            $questions = DB::table('practice_test_questions')
                ->where('practice_test_id', $id)
                ->get();
                
            if ($questions->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No questions found for this test',
                ], 404);
            }

            $correctCount = 0;
            $totalPoints = 0;
            $earnedPoints = 0;

            foreach ($questions as $question) {
                $totalPoints += $question->points;
                $correctAnswer = json_decode($question->correct_answer, true);
                
                // Handle legacy format (plain value) vs new format (JSON object)
                if (!is_array($correctAnswer)) {
                    // Legacy format - convert to new format
                    if ($question->question_type === 'multiple_choice') {
                        $correctAnswer = ['index' => (int)$question->correct_answer];
                    } elseif ($question->question_type === 'true_false') {
                        $correctAnswer = ['value' => (bool)$question->correct_answer];
                    } elseif ($question->question_type === 'identification') {
                        $correctAnswer = ['text' => $question->correct_answer];
                    }
                }
                
                $studentAnswer = $answers[$question->id] ?? null;

                $isCorrect = false;

                if ($question->question_type === 'multiple_choice') {
                    $isCorrect = isset($correctAnswer['index']) && (int)$studentAnswer === (int)$correctAnswer['index'];
                } elseif ($question->question_type === 'true_false') {
                    $isCorrect = isset($correctAnswer['value']) && $studentAnswer === ($correctAnswer['value'] ? 'true' : 'false');
                } elseif ($question->question_type === 'identification') {
                    $isCorrect = isset($correctAnswer['text']) && strtolower(trim($studentAnswer ?? '')) === strtolower(trim($correctAnswer['text']));
                }

                if ($isCorrect) {
                    $correctCount++;
                    $earnedPoints += $question->points;
                }
            }

            $scorePercentage = $totalPoints > 0 ? round(($earnedPoints / $totalPoints) * 100) : 0;

            // Save attempt
            DB::table('practice_test_attempts')->insert([
                'practice_test_id' => $id,
                'student_id' => $studentId,
                'answers' => json_encode($answers),
                'correct_count' => $correctCount,
                'total_questions' => $questions->count(),
                'earned_points' => $earnedPoints,
                'total_points' => $totalPoints,
                'score_percentage' => $scorePercentage,
                'completed_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Notify teacher about test completion
            $test = DB::table('practice_tests')->find($id);
            if ($test && $test->teacher_id) {
                $student = DB::table('users')->find($studentId);
                $studentName = $student ? $student->name : 'A student';
                
                DB::table('notifications')->insert([
                    'user_id' => $test->teacher_id,
                    'created_by' => $studentId,
                    'type' => 'teacher_alert',
                    'title' => 'Student completed test',
                    'message' => $studentName.' completed "'.$test->title.'" with '.$scorePercentage.'%.',
                    'payload' => json_encode([
                        'practice_test_id' => $id,
                        'student_id' => $studentId,
                        'score' => $scorePercentage,
                    ]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return response()->json([
                'success' => true,
                'score' => $scorePercentage,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to submit practice test: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit test',
            ], 500);
        }
    }

    /**
     * Get test results
     */
    public function getResults($id): JsonResponse
    {
        try {
            $studentId = auth()->id();

            $attempt = DB::table('practice_test_attempts')
                ->where('practice_test_id', $id)
                ->where('student_id', $studentId)
                ->first();

            if (!$attempt) {
                return response()->json(['message' => 'Results not found'], 404);
            }

            $test = DB::table('practice_tests')->find($id);
            $questions = DB::table('practice_test_questions')
                ->where('practice_test_id', $id)
                ->orderBy('order_number')
                ->get();

            $studentAnswers = json_decode($attempt->answers, true);

            $questionsWithResults = $questions->map(function ($q) use ($studentAnswers) {
                $correctAnswer = json_decode($q->correct_answer, true);
                
                // Handle legacy format (plain value) vs new format (JSON object)
                if (!is_array($correctAnswer)) {
                    // Legacy format - convert to new format
                    if ($q->question_type === 'multiple_choice') {
                        $correctAnswer = ['index' => (int)$q->correct_answer];
                    } elseif ($q->question_type === 'true_false') {
                        $correctAnswer = ['value' => (bool)$q->correct_answer];
                    } elseif ($q->question_type === 'identification') {
                        $correctAnswer = ['text' => $q->correct_answer];
                    }
                }
                
                $studentAnswer = $studentAnswers[$q->id] ?? null;

                $isCorrect = false;
                $correctAnswerStr = '';

                if ($q->question_type === 'multiple_choice') {
                    $correctAnswerStr = isset($correctAnswer['index']) ? (string)$correctAnswer['index'] : '';
                    $isCorrect = isset($correctAnswer['index']) && (int)$studentAnswer === (int)$correctAnswer['index'];
                } elseif ($q->question_type === 'true_false') {
                    $correctAnswerStr = isset($correctAnswer['value']) && $correctAnswer['value'] ? 'true' : 'false';
                    $isCorrect = isset($correctAnswer['value']) && $studentAnswer === $correctAnswerStr;
                } elseif ($q->question_type === 'identification') {
                    $correctAnswerStr = $correctAnswer['text'] ?? '';
                    $isCorrect = isset($correctAnswer['text']) && strtolower(trim($studentAnswer ?? '')) === strtolower(trim($correctAnswerStr));
                }

                return [
                    'id' => $q->id,
                    'type' => $q->question_type,
                    'questionText' => $q->question_text,
                    'options' => $q->options ? json_decode($q->options) : null,
                    'studentAnswer' => $studentAnswer,
                    'correctAnswer' => $correctAnswerStr,
                    'isCorrect' => $isCorrect,
                    'points' => $q->points,
                    'earnedPoints' => $isCorrect ? $q->points : 0,
                ];
            });

            return response()->json([
                'testId' => $test->id,
                'testTitle' => $test->title,
                'subject' => $test->subject,
                'totalQuestions' => $attempt->total_questions,
                'correctAnswers' => $attempt->correct_count,
                'totalPoints' => $attempt->total_points,
                'earnedPoints' => $attempt->earned_points,
                'scorePercentage' => $attempt->score_percentage,
                'completedAt' => date('M d, Y', strtotime($attempt->completed_at)),
                'questions' => $questionsWithResults,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get test results: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to load results'], 500);
        }
    }
}
