<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LearningHubController extends Controller
{
    private function ensureGamificationSeed(): void
    {
        if ((int) DB::table('gamification_rules')->count() === 0) {
            $rules = [
                ['rule_key' => 'flashcard_known_xp', 'rule_value' => 10],
                ['rule_key' => 'quiz_completion_xp', 'rule_value' => 25],
                ['rule_key' => 'perfect_score_bonus_xp', 'rule_value' => 30],
                ['rule_key' => 'daily_login_xp', 'rule_value' => 15],
                ['rule_key' => 'streak_milestone_xp', 'rule_value' => 20],
                ['rule_key' => 'level_step_xp', 'rule_value' => 120],
            ];

            foreach ($rules as $rule) {
                DB::table('gamification_rules')->insert([
                    'rule_key' => $rule['rule_key'],
                    'rule_value' => $rule['rule_value'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        if ((int) DB::table('badges')->count() === 0) {
            // Keep the badge catalog empty until real badges are created.
        }
    }

    private function gamificationRules(): array
    {
        $this->ensureGamificationSeed();

        return DB::table('gamification_rules')->pluck('rule_value', 'rule_key')
            ->map(fn ($value) => (int) $value)
            ->all();
    }

    private function xpForLevel(int $level, int $step): int
    {
        $safeLevel = max($level, 1);

        return $safeLevel * $step;
    }

    private function levelForXp(int $xp, int $step): int
    {
        if ($step <= 0) {
            return 1;
        }

        return max(1, (int) floor($xp / $step) + 1);
    }

    private function syncLeaderboardRow(int $userId): void
    {
        $points = DB::table('user_points')->where('user_id', $userId)->first();
        if (! $points) {
            return;
        }

        DB::table('leaderboard')->updateOrInsert(
            ['user_id' => $userId, 'scope' => 'global', 'week_key' => null],
            [
                'score' => (int) $points->xp,
                'rank' => 0,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        $weekKey = now()->format('o-W');
        $weeklyScore = (int) DB::table('gamification_events')
            ->where('user_id', $userId)
            ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
            ->sum('xp_delta');

        DB::table('leaderboard')->updateOrInsert(
            ['user_id' => $userId, 'scope' => 'weekly', 'week_key' => $weekKey],
            [
                'score' => $weeklyScore,
                'rank' => 0,
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        $globalRows = DB::table('leaderboard')->where('scope', 'global')->orderByDesc('score')->get();
        foreach ($globalRows as $index => $row) {
            DB::table('leaderboard')->where('id', $row->id)->update(['rank' => $index + 1, 'updated_at' => now()]);
        }

        $weeklyRows = DB::table('leaderboard')
            ->where('scope', 'weekly')
            ->where('week_key', $weekKey)
            ->orderByDesc('score')
            ->get();
        foreach ($weeklyRows as $index => $row) {
            DB::table('leaderboard')->where('id', $row->id)->update(['rank' => $index + 1, 'updated_at' => now()]);
        }
    }

    private function awardXp(int $userId, int $xpDelta, string $source, array $meta = []): array
    {
        $rules = $this->gamificationRules();
        $step = max(1, (int) ($rules['level_step_xp'] ?? 120));

        $pointsRow = DB::table('user_points')->where('user_id', $userId)->first();
        if (! $pointsRow) {
            DB::table('user_points')->insert([
                'user_id' => $userId,
                'xp' => 0,
                'level' => 1,
                'title' => 'Beginner',
                'total_points' => 0,
                'last_daily_login_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $pointsRow = DB::table('user_points')->where('user_id', $userId)->first();
        }

        $nextXp = max(0, (int) $pointsRow->xp + $xpDelta);
        $nextLevel = $this->levelForXp($nextXp, $step);
        $title = match (true) {
            $nextLevel >= 12 => 'Legend',
            $nextLevel >= 9 => 'Master',
            $nextLevel >= 6 => 'Scholar',
            $nextLevel >= 3 => 'Explorer',
            default => 'Beginner',
        };

        DB::table('user_points')->where('user_id', $userId)->update([
            'xp' => $nextXp,
            'level' => $nextLevel,
            'title' => $title,
            'total_points' => DB::raw('COALESCE(total_points, 0) + '.$xpDelta),
            'updated_at' => now(),
        ]);

        DB::table('gamification_events')->insert([
            'user_id' => $userId,
            'source' => $source,
            'xp_delta' => $xpDelta,
            'meta' => empty($meta) ? null : json_encode($meta),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->syncLeaderboardRow($userId);
        $this->syncGamificationBadges($userId);

        $levelFloorXp = $this->xpForLevel($nextLevel - 1, $step);
        $levelCeilXp = $this->xpForLevel($nextLevel, $step);

        return [
            'xp' => $nextXp,
            'level' => $nextLevel,
            'title' => $title,
            'xpToNextLevel' => max(0, $levelCeilXp - $nextXp),
            'levelProgressPercent' => (int) round((($nextXp - $levelFloorXp) / max(1, ($levelCeilXp - $levelFloorXp))) * 100),
        ];
    }

    private function syncStreak(int $userId): int
    {
        $row = DB::table('streaks')->where('user_id', $userId)->first();
        $today = now()->toDateString();

        if (! $row) {
            DB::table('streaks')->insert([
                'user_id' => $userId,
                'streak_count' => 1,
                'best_streak' => 1,
                'last_activity_date' => $today,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return 1;
        }

        $last = $row->last_activity_date ? (string) $row->last_activity_date : null;
        if ($last === $today) {
            return (int) $row->streak_count;
        }

        $yesterday = now()->subDay()->toDateString();
        $nextStreak = $last === $yesterday ? (int) $row->streak_count + 1 : 1;

        DB::table('streaks')->where('user_id', $userId)->update([
            'streak_count' => $nextStreak,
            'best_streak' => max((int) $row->best_streak, $nextStreak),
            'last_activity_date' => $today,
            'updated_at' => now(),
        ]);

        return $nextStreak;
    }

    private function syncGamificationBadges(int $userId): void
    {
        $this->ensureGamificationSeed();

        $flashcardsKnown = (int) DB::table('gamification_events')
            ->where('user_id', $userId)
            ->where('source', 'flashcard_known')
            ->count();
        $bestQuizScore = (int) (DB::table('quiz_attempts')->where('student_id', $userId)->max('score') ?? 0);
        $quizAttempts = (int) DB::table('quiz_attempts')->where('student_id', $userId)->count();
        $streakDays = (int) (DB::table('streaks')->where('user_id', $userId)->value('streak_count') ?? 0);

        $badges = DB::table('badges')->get();
        foreach ($badges as $badge) {
            $progress = match ($badge->requirement_type) {
                'flashcards_known' => $flashcardsKnown,
                'best_quiz_score' => $bestQuizScore,
                'quiz_attempts' => $quizAttempts,
                'streak_days' => $streakDays,
                default => 0,
            };

            $alreadyEarned = DB::table('user_badges')
                ->where('user_id', $userId)
                ->where('badge_id', $badge->id)
                ->whereNotNull('date_earned')
                ->exists();

            $earnedAt = $progress >= (int) $badge->requirement_value ? now() : null;

            DB::table('user_badges')->updateOrInsert(
                ['user_id' => $userId, 'badge_id' => $badge->id],
                [
                    'progress' => $progress,
                    'date_earned' => $earnedAt,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );

            if ($earnedAt && ! $alreadyEarned) {
                $this->awardXp($userId, (int) $badge->xp_reward, 'badge_reward', ['badge' => $badge->code]);
                DB::table('notifications')->insert([
                    'user_id' => $userId,
                    'created_by' => $userId,
                    'type' => 'badge_earned',
                    'title' => 'Badge unlocked',
                    'message' => 'You unlocked '.$badge->name.'.',
                    'payload' => json_encode(['badgeCode' => $badge->code]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    private function ensureRole(Request $request, string $role): ?JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->role !== $role) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return null;
    }

    private function teacherStudySets(int $teacherId): array
    {
        return DB::table('study_sets')
            ->where('teacher_id', $teacherId)
            ->get()
            ->map(function ($set) {
                return [
                    'id' => (string) $set->id,
                    'title' => $set->title,
                    'subject' => $set->subject,
                    'className' => $set->class_name,
                    'visibility' => $set->visibility,
                    'cards' => (int) $set->cards_count,
                    'updatedAt' => optional($set->updated_at)?->diffForHumans() ?? 'just now',
                ];
            })
            ->values()
            ->all();
    }

    private function teacherStudents(int $teacherId): array
    {
        $progressByStudent = DB::table('student_progress')
            ->join('study_sets', 'study_sets.id', '=', 'student_progress.study_set_id')
            ->where('study_sets.teacher_id', $teacherId)
            ->groupBy('student_progress.student_id')
            ->selectRaw('student_progress.student_id, ROUND(AVG(student_progress.completion_rate)) as completion_rate, ROUND(AVG(student_progress.last_score)) as last_score, MAX(student_progress.weak_area) as weak_area, MAX(student_progress.updated_at) as updated_at');

        return DB::table('users')
            ->leftJoin('class_students', 'class_students.student_id', '=', 'users.id')
            ->leftJoin('classes', function ($join) use ($teacherId) {
                $join->on('classes.id', '=', 'class_students.class_id')
                    ->where('classes.teacher_id', '=', $teacherId);
            })
            ->leftJoinSub($progressByStudent, 'progress', function ($join) {
                $join->on('progress.student_id', '=', 'users.id');
            })
            ->where('users.role', 'student')
            ->groupBy('users.id', 'users.name', 'progress.completion_rate', 'progress.last_score', 'progress.weak_area', 'progress.updated_at')
            ->select(
                'users.id',
                'users.name',
                DB::raw("COALESCE(MAX(classes.name), 'Unassigned') as class_name"),
                'progress.completion_rate',
                'progress.last_score',
                'progress.weak_area',
                'progress.updated_at'
            )
            ->orderBy('users.name')
            ->get()
            ->map(function ($row) {
                return [
                    'id' => 'st-'.$row->id,
                    'name' => $row->name,
                    'className' => $row->class_name ?? 'Unassigned',
                    'completion' => (int) ($row->completion_rate ?? 0),
                    'quizScore' => (int) ($row->last_score ?? 0),
                    'weakArea' => $row->weak_area ?? 'Needs review',
                    'lastActive' => optional($row->updated_at)?->diffForHumans() ?? 'just now',
                ];
            })
            ->values()
            ->all();
    }

    private function teacherClassMetrics(array $students): array
    {
        // First try to get metrics from students array
        $metrics = collect($students)
            ->filter(fn($s) => $s['className'] !== 'Unassigned')
            ->groupBy('className')
            ->map(function ($rows, $className) {
                $avgScore = (int) round(collect($rows)->avg('quizScore'));
                $completionRate = (int) round(collect($rows)->avg('completion'));

                return [
                    'className' => (string) $className,
                    'avgScore' => $avgScore,
                    'completionRate' => $completionRate,
                    'engagement' => min(100, (int) round(($avgScore + $completionRate) / 2 + 6)),
                ];
            })
            ->values()
            ->all();

        return $metrics;
    }

    private function teacherClassMetricsFromTests(int $teacherId): array
    {
        // Get metrics directly from practice test attempts
        $testMetrics = DB::table('practice_test_attempts')
            ->join('practice_tests', 'practice_tests.id', '=', 'practice_test_attempts.practice_test_id')
            ->where('practice_tests.teacher_id', $teacherId)
            ->whereNotNull('practice_tests.class_name')
            ->selectRaw('
                practice_tests.class_name,
                AVG(practice_test_attempts.score_percentage) as avg_score,
                COUNT(DISTINCT practice_test_attempts.student_id) as students_completed
            ')
            ->groupBy('practice_tests.class_name')
            ->get();

        if ($testMetrics->isEmpty()) {
            return [];
        }

        return $testMetrics->map(function ($row) {
            $avgScore = (int) round((float) $row->avg_score);
            // Estimate completion based on activity
            $completionRate = min(100, (int) ($row->students_completed * 10));

            return [
                'className' => $row->class_name,
                'avgScore' => $avgScore,
                'completionRate' => $completionRate,
                'engagement' => min(100, (int) round(($avgScore + $completionRate) / 2)),
            ];
        })->values()->all();
    }

    private function teacherSummaryMetrics(array $studySets, array $classMetrics): array
    {
        $averageEngagement = $classMetrics === [] ? 0 : (int) round(collect($classMetrics)->avg('engagement'));
        $averageCompletion = $classMetrics === [] ? 0 : (int) round(collect($classMetrics)->avg('completionRate'));
        $averageScore = $classMetrics === [] ? 0 : (int) round(collect($classMetrics)->avg('avgScore'));

        return [
            [
                'label' => 'Total study sets created',
                'value' => (string) count($studySets),
                'delta' => count($studySets) > 0 ? '+'.max(1, (int) round(count($studySets) / 3)).' this week' : 'No activity yet',
            ],
            [
                'label' => 'Student engagement',
                'value' => $averageEngagement.'%',
                'delta' => $averageEngagement > 0 ? 'Live from student activity' : 'No activity yet',
            ],
            [
                'label' => 'Class completion',
                'value' => $averageCompletion.'%',
                'delta' => $averageCompletion > 0 ? 'Pulled from progress endpoint' : 'No activity yet',
            ],
            [
                'label' => 'Average quiz score',
                'value' => $averageScore.'%',
                'delta' => $averageScore > 0 ? 'Synchronized with submissions' : 'No activity yet',
            ],
        ];
    }

    private function teacherActivities(int $teacherId): array
    {
        return DB::table('notifications')
            ->join('users', 'users.id', '=', 'notifications.user_id')
            ->where('notifications.type', 'teacher_alert')
            ->where('notifications.created_by', $teacherId)
            ->orderByDesc('notifications.created_at')
            ->limit(6)
            ->select('notifications.title', 'notifications.message', 'notifications.created_at', 'users.name')
            ->get()
            ->map(function ($row, int $index) {
                return [
                    'id' => 'act-'.($index + 1),
                    'student' => $row->name,
                    'action' => $row->title,
                    'resource' => $row->message,
                    'time' => optional($row->created_at)?->diffForHumans() ?? 'just now',
                ];
            })
            ->values()
            ->all();
    }

    private function teacherDifficultQuestions(int $teacherId): array
    {
        return DB::table('quiz_questions')
            ->leftJoin('quiz_attempts', 'quiz_attempts.quiz_id', '=', 'quiz_questions.quiz_id')
            ->leftJoin('study_sets', 'study_sets.id', '=', 'quiz_attempts.study_set_id')
            ->where('study_sets.teacher_id', $teacherId)
            ->groupBy('quiz_questions.id', 'quiz_questions.prompt', 'study_sets.class_name')
            ->selectRaw('quiz_questions.prompt as question, study_sets.class_name as className, COUNT(quiz_attempts.id) as attempts, 50 as correctRate')
            ->limit(5)
            ->get()
            ->map(function ($row) {
                return [
                    'question' => $row->question,
                    'className' => $row->className ?? 'Unassigned',
                    'attempts' => (int) $row->attempts,
                    'correctRate' => (int) $row->correctRate,
                ];
            })
            ->values()
            ->all();
    }

    private function teacherBadgeProgress(): array
    {
        return DB::table('student_achievements')
            ->join('achievements', 'achievements.id', '=', 'student_achievements.achievement_id')
            ->join('users', 'users.id', '=', 'student_achievements.student_id')
            ->whereNotIn('achievements.code', ['flashcard-master', 'quiz-champion', 'study-streak', 'perfect-score'])
            ->select('student_achievements.id', 'achievements.name as badge', 'users.name as student', 'student_achievements.progress', 'achievements.target_value as target', 'achievements.description')
            ->limit(12)
            ->get()
            ->map(function ($row) {
                return [
                    'id' => 'b-'.$row->id,
                    'badge' => $row->badge,
                    'student' => $row->student,
                    'progress' => (int) $row->progress,
                    'target' => (int) $row->target,
                    'description' => $row->description,
                ];
            })
            ->values()
            ->all();
    }

    private function teacherReportPoints(int $teacherId): array
    {
        // Get all quiz attempts for this teacher
        $quizData = DB::table('quiz_attempts')
            ->join('quizzes', 'quizzes.id', '=', 'quiz_attempts.quiz_id')
            ->join('study_sets', 'study_sets.id', '=', 'quizzes.study_set_id')
            ->where('study_sets.teacher_id', $teacherId)
            ->whereDate('quiz_attempts.created_at', '>=', now()->subDays(30))
            ->selectRaw('DATE(quiz_attempts.created_at) as date, AVG(quiz_attempts.score) as avg_score, COUNT(DISTINCT quiz_attempts.student_id) as students')
            ->groupBy('date')
            ->get();

        // Get all practice test attempts for this teacher
        $testData = DB::table('practice_test_attempts')
            ->join('practice_tests', 'practice_tests.id', '=', 'practice_test_attempts.practice_test_id')
            ->where('practice_tests.teacher_id', $teacherId)
            ->whereDate('practice_test_attempts.completed_at', '>=', now()->subDays(30))
            ->selectRaw('DATE(practice_test_attempts.completed_at) as date, AVG(practice_test_attempts.score_percentage) as avg_score, COUNT(DISTINCT practice_test_attempts.student_id) as students')
            ->groupBy('date')
            ->get();

        // Get total students
        $totalStudents = DB::table('class_students')
            ->join('classes', 'classes.id', '=', 'class_students.class_id')
            ->where('classes.teacher_id', $teacherId)
            ->distinct('class_students.student_id')
            ->count('class_students.student_id');

        if ($totalStudents === 0) {
            $totalStudents = 1; // Avoid division by zero
        }

        // Merge data by date
        $dataByDate = [];
        
        foreach ($quizData as $row) {
            $date = $row->date;
            if (!isset($dataByDate[$date])) {
                $dataByDate[$date] = ['scores' => [], 'students' => 0];
            }
            $dataByDate[$date]['scores'][] = (float) $row->avg_score;
            $dataByDate[$date]['students'] += (int) $row->students;
        }
        
        foreach ($testData as $row) {
            $date = $row->date;
            if (!isset($dataByDate[$date])) {
                $dataByDate[$date] = ['scores' => [], 'students' => 0];
            }
            $dataByDate[$date]['scores'][] = (float) $row->avg_score;
            $dataByDate[$date]['students'] += (int) $row->students;
        }

        // Build report for last 7 days
        $reportData = [];
        
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $dateStr = $date->format('Y-m-d');
            $label = $date->format('M j');

            $avgScore = 0;
            $activeStudents = 0;
            
            if (isset($dataByDate[$dateStr]) && count($dataByDate[$dateStr]['scores']) > 0) {
                $avgScore = array_sum($dataByDate[$dateStr]['scores']) / count($dataByDate[$dateStr]['scores']);
                $activeStudents = $dataByDate[$dateStr]['students'];
            }

            $completionRate = ($activeStudents / $totalStudents) * 100;
            $engagement = $avgScore > 0 || $completionRate > 0 
                ? min(100, ($avgScore + $completionRate) / 2)
                : 0;

            $reportData[] = [
                'label' => $label,
                'engagement' => (int) round($engagement),
                'completion' => (int) round($completionRate),
                'score' => (int) round($avgScore),
            ];
        }

        return $reportData;
    }

    private function formatTeacherDashboard(int $teacherId): array
    {
        $studySets = $this->teacherStudySets($teacherId);
        $students = $this->teacherStudents($teacherId);
        $classMetrics = $this->teacherClassMetrics($students);
        
        // If no metrics from students, try to get from tests directly
        if (empty($classMetrics)) {
            $classMetrics = $this->teacherClassMetricsFromTests($teacherId);
        }

        return [
            'summaryMetrics' => $this->teacherSummaryMetrics($studySets, $classMetrics),
            'studySets' => $studySets,
            'students' => $students,
            'activities' => $this->teacherActivities($teacherId),
            'reportPoints' => $this->teacherReportPoints($teacherId),
            'classMetrics' => $classMetrics,
            'badgeProgress' => $this->teacherBadgeProgress(),
            'difficultQuestions' => $this->teacherDifficultQuestions($teacherId),
        ];
    }

    public function teacherDashboard(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        return response()->json($this->formatTeacherDashboard((int) $request->user()->id));
    }

    public function teacherNotifications(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $notifications = DB::table('notifications')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'type', 'title', 'message', 'read_at', 'created_at'])
            ->map(fn ($row) => [
                'id' => (string) $row->id,
                'type' => $row->type,
                'title' => $row->title,
                'message' => $row->message,
                'read' => ! is_null($row->read_at),
                'createdAt' => optional($row->created_at)?->toISOString(),
            ])
            ->values();

        return response()->json(['notifications' => $notifications]);
    }

    /**
     * Generate flashcards or quiz questions using AI from uploaded file or text
     */
    public function generateContent(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        try {
            $validated = $request->validate([
                'contentType' => ['required', 'in:flashcards,quiz'],
                'questionType' => ['nullable', 'in:multiple_choice,true_false,identification,mixed'],
                'source' => ['required', 'in:text,pdf,powerpoint'],
                'text' => ['required_if:source,text', 'string'],
                'file' => ['required_if:source,pdf,powerpoint', 'file'],
                'itemCount' => ['nullable', 'integer', 'min:1', 'max:50'],
            ]);

            $contentType = $validated['contentType'];
            $itemCount = (int) ($validated['itemCount'] ?? 5);
            $itemCount = min(max($itemCount, 1), 50); // Limit to prevent abuse

            // Extract content based on source
            $content = '';
            
            if (in_array($validated['source'], ['pdf', 'powerpoint'])) {
                if (!$request->hasFile('file')) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No file uploaded',
                    ], 400);
                }

                $file = $request->file('file');
                $content = $this->extractFileContent($file);
            } else {
                $content = $validated['text'];
            }

            if (empty($content)) {
                return response()->json([
                    'success' => false,
                    'message' => 'No content to generate from',
                ], 400);
            }

            // Generate content based on type
            if ($contentType === 'flashcards') {
                $items = $this->generateFlashcardsFromContent($content, $itemCount);
            } else {
                $questionType = $validated['questionType'] ?? 'mixed';
                $items = $this->generateQuizQuestionsFromContent($content, $questionType, $itemCount);
            }

            return response()->json([
                'success' => true,
                'contentType' => $contentType,
                'items' => $items,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to generate content: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Extract content from uploaded file (PDF or PowerPoint)
     */
    private function extractFileContent($file): string
    {
        // Placeholder implementation
        // In production, use:
        // - Smalot\PdfParser\Parser for PDF files
        // - PHPPresentation for PowerPoint files
        
        return "Sample educational content extracted from " . $file->getClientOriginalName() . ". " .
               "This content covers key concepts, definitions, and important topics that can be used to create study materials.";
    }

    /**
     * Generate flashcards from content using AI
     */
    private function generateFlashcardsFromContent(string $content, int $count): array
    {
        // Placeholder implementation
        // In production, integrate with OpenAI API
        
        $flashcards = [];
        $sampleTerms = [
            ['term' => 'Photosynthesis', 'definition' => 'The process by which plants convert light energy into chemical energy stored in glucose.'],
            ['term' => 'Mitochondria', 'definition' => 'The powerhouse of the cell, responsible for producing ATP through cellular respiration.'],
            ['term' => 'Ecosystem', 'definition' => 'A biological community of interacting organisms and their physical environment.'],
            ['term' => 'Homeostasis', 'definition' => 'The ability of an organism to maintain stable internal conditions despite external changes.'],
            ['term' => 'Natural Selection', 'definition' => 'The process where organisms with favorable traits are more likely to survive and reproduce.'],
            ['term' => 'Cell Membrane', 'definition' => 'A selectively permeable barrier that controls what enters and exits the cell.'],
            ['term' => 'DNA', 'definition' => 'Deoxyribonucleic acid, the molecule that carries genetic information in living organisms.'],
            ['term' => 'Enzyme', 'definition' => 'A biological catalyst that speeds up chemical reactions in living organisms.'],
        ];

        for ($i = 0; $i < $count; $i++) {
            $sample = $sampleTerms[$i % count($sampleTerms)];
            $flashcards[] = [
                'id' => 'gen-flash-' . time() . '-' . $i . '-' . rand(1000, 9999),
                'term' => $sample['term'] . ' (Generated ' . ($i + 1) . ')',
                'definition' => $sample['definition'],
                'image' => null,
            ];
        }

        return $flashcards;
    }

    /**
     * Generate quiz questions from content using AI
     */
    private function generateQuizQuestionsFromContent(string $content, string $questionType, int $count): array
    {
        // Placeholder implementation
        // In production, integrate with OpenAI API
        
        $questions = [];
        
        for ($i = 0; $i < $count; $i++) {
            $id = 'gen-quiz-' . time() . '-' . $i . '-' . rand(1000, 9999);
            
            // Determine question type for this iteration
            $type = $questionType;
            if ($questionType === 'mixed') {
                $types = ['multiple_choice', 'true_false', 'identification'];
                $type = $types[$i % count($types)];
            }
            
            if ($type === 'multiple_choice') {
                $questions[] = [
                    'id' => $id,
                    'type' => 'multiple_choice',
                    'question' => 'Based on the content, which statement best describes the main concept? (Question ' . ($i + 1) . ')',
                    'options' => [
                        'The process involves converting energy from one form to another',
                        'The structure is responsible for maintaining cellular functions',
                        'The system operates through a series of interconnected components',
                        'The mechanism ensures stability and adaptation to environmental changes',
                    ],
                    'answer' => (string) rand(0, 3),
                ];
            } elseif ($type === 'true_false') {
                $statements = [
                    'The primary function of this system is to maintain balance and equilibrium',
                    'This process requires external energy input to function properly',
                    'The structure can adapt to changes in environmental conditions',
                    'This mechanism is found exclusively in complex organisms',
                    'The system operates independently without external influence',
                ];
                
                $questions[] = [
                    'id' => $id,
                    'type' => 'true_false',
                    'question' => $statements[$i % count($statements)] . ' (Question ' . ($i + 1) . ')',
                    'answer' => rand(0, 1) === 1 ? 'true' : 'false',
                ];
            } else {
                $prompts = [
                    'What is the primary function of this biological structure?',
                    'Identify the key process described in the content.',
                    'Name the mechanism responsible for maintaining stability.',
                    'What term describes the interaction between these components?',
                    'Identify the main characteristic of this system.',
                ];
                
                $questions[] = [
                    'id' => $id,
                    'type' => 'identification',
                    'question' => $prompts[$i % count($prompts)] . ' (Question ' . ($i + 1) . ')',
                    'answer' => 'Sample Answer',
                ];
            }
        }

        return $questions;
    }

    public function createStudySet(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'subject' => ['nullable', 'string', 'max:255'],
            'className' => ['nullable', 'string', 'max:255'],
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'schedule' => ['nullable', 'date'],
            'visibility' => ['nullable', 'in:public,private'],
            'flashcards' => ['nullable', 'array'],
            'flashcards.*.term' => ['required_with:flashcards', 'string'],
            'flashcards.*.definition' => ['required_with:flashcards', 'string'],
            'flashcards.*.image' => ['nullable', 'string'],
            'quizQuestions' => ['nullable', 'array'],
            'quizQuestions.*.question' => ['required_with:quizQuestions', 'string'],
            'quizQuestions.*.type' => ['required_with:quizQuestions', 'in:multiple_choice,true_false,identification'],
            'quizQuestions.*.options' => ['nullable', 'array'],
            'quizQuestions.*.answer' => ['required_with:quizQuestions', 'string'],
            'practiceMinutes' => ['nullable', 'integer', 'min:1'],
            'passingScore' => ['nullable', 'integer', 'min:1', 'max:100'],
            'shareMode' => ['nullable', 'in:class,private,public'],
        ]);

        DB::beginTransaction();
        try {
            $setId = DB::table('study_sets')->insertGetId([
                'teacher_id' => $request->user()->id,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'subject' => $validated['subject'] ?? 'General',
                'class_name' => $validated['className'] ?? 'Unassigned',
                'class_id' => $validated['class_id'] ?? null,
                'schedule' => $validated['schedule'] ?? null,
                'visibility' => $validated['visibility'] ?? 'public',
                'cards_count' => count($validated['flashcards'] ?? []),
                'is_published' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach (($validated['flashcards'] ?? []) as $card) {
                DB::table('flashcards')->insert([
                    'study_set_id' => $setId,
                    'term' => $card['term'],
                    'definition' => $card['definition'],
                    'image_url' => $card['image'] ?? null,
                    'difficulty' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            if (! empty($validated['quizQuestions'])) {
                $quizId = DB::table('quizzes')->insertGetId([
                    'study_set_id' => $setId,
                    'title' => $validated['title'].' Quiz',
                    'quiz_type' => 'mixed',
                    'time_limit_minutes' => $validated['practiceMinutes'] ?? 20,
                    'pass_score' => $validated['passingScore'] ?? 75,
                    'is_practice_test' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                foreach ($validated['quizQuestions'] as $question) {
                    DB::table('quiz_questions')->insert([
                        'quiz_id' => $quizId,
                        'question_type' => $question['type'],
                        'prompt' => $question['question'],
                        'choices' => empty($question['options']) ? null : json_encode($question['options']),
                        'correct_answer' => $question['answer'],
                        'explanation' => null,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            if (($validated['shareMode'] ?? 'class') === 'class' && !empty($validated['class_id'])) {
                // Assign to all students in the selected class
                $studentIds = DB::table('class_students')
                    ->where('class_id', $validated['class_id'])
                    ->pluck('student_id');
                
                // Determine what content types are included
                $hasFlashcards = !empty($validated['flashcards']);
                $hasQuiz = !empty($validated['quizQuestions']);
                
                $contentTypes = [];
                if ($hasFlashcards) $contentTypes[] = 'flashcards';
                if ($hasQuiz) $contentTypes[] = 'quiz';
                
                $contentDescription = !empty($contentTypes) 
                    ? ' with ' . implode(' and ', $contentTypes)
                    : '';
                    
                foreach ($studentIds as $studentId) {
                    DB::table('study_set_assignments')->insert([
                        'study_set_id' => $setId,
                        'student_id' => $studentId,
                        'assigned_by' => $request->user()->id,
                        'assignment_scope' => 'class',
                        'assigned_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    DB::table('notifications')->insert([
                        'user_id' => $studentId,
                        'created_by' => $request->user()->id,
                        'type' => 'study_set_assigned',
                        'title' => 'New study materials uploaded',
                        'message' => 'Your teacher has uploaded "'.$validated['title'].'"'.$contentDescription.' for '.(($validated['subject'] ?? 'General')).'.',
                        'payload' => json_encode([
                            'study_set_id' => $setId,
                            'has_flashcards' => $hasFlashcards,
                            'has_quiz' => $hasQuiz,
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Study set created and synchronized successfully.',
                'studySetId' => $setId,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Unable to create study set.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function assignStudySet(Request $request, int $studySetId): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $validated = $request->validate([
            'studentIds' => ['required', 'array', 'min:1'],
            'studentIds.*' => ['integer', 'exists:users,id'],
            'scope' => ['nullable', 'in:individual,class'],
        ]);

        $studySet = DB::table('study_sets')
            ->where('id', $studySetId)
            ->where('teacher_id', $request->user()->id)
            ->first();

        if (! $studySet) {
            return response()->json(['message' => 'Study set not found.'], 404);
        }

        foreach ($validated['studentIds'] as $studentId) {
            DB::table('study_set_assignments')->updateOrInsert(
                ['study_set_id' => $studySetId, 'student_id' => $studentId],
                [
                    'assigned_by' => $request->user()->id,
                    'assignment_scope' => $validated['scope'] ?? 'individual',
                    'assigned_at' => now(),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );

            DB::table('notifications')->insert([
                'user_id' => $studentId,
                'created_by' => $request->user()->id,
                'type' => 'study_set_assigned',
                'title' => 'New study set assigned',
                'message' => $studySet->title.' has been assigned to you.',
                'payload' => json_encode(['study_set_id' => $studySetId]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Study set assigned successfully.']);
    }

    public function updateStudySet(Request $request, int $studySetId): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $studySet = DB::table('study_sets')
            ->where('id', $studySetId)
            ->where('teacher_id', $request->user()->id)
            ->first();

        if (! $studySet) {
            return response()->json(['message' => 'Study set not found.'], 404);
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'subject' => ['nullable', 'string', 'max:255'],
            'className' => ['nullable', 'string', 'max:255'],
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'schedule' => ['nullable', 'date'],
            'visibility' => ['nullable', 'in:public,private'],
        ]);

        DB::table('study_sets')
            ->where('id', $studySetId)
            ->update([
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'subject' => $validated['subject'] ?? $studySet->subject,
                'class_name' => $validated['className'] ?? $studySet->class_name,
                'class_id' => $validated['class_id'] ?? null,
                'schedule' => $validated['schedule'] ?? null,
                'visibility' => $validated['visibility'] ?? $studySet->visibility,
                'updated_at' => now(),
            ]);

        return response()->json(['message' => 'Study set updated successfully.']);
    }

    public function deleteStudySet(Request $request, int $studySetId): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $studySet = DB::table('study_sets')
            ->where('id', $studySetId)
            ->where('teacher_id', $request->user()->id)
            ->first();

        if (! $studySet) {
            return response()->json(['message' => 'Study set not found.'], 404);
        }

        // Delete cascades will handle related flashcards, quizzes, etc.
        DB::table('study_sets')->where('id', $studySetId)->delete();

        return response()->json(['message' => 'Study set deleted successfully.']);
    }

    public function studentDashboard(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'student')) {
            return $error;
        }

        $studentId = (int) $request->user()->id;

        $assignedSetIds = DB::table('study_set_assignments')
            ->where('student_id', $studentId)
            ->pluck('study_set_id');

        $sets = DB::table('study_sets')
            ->where(function ($query) use ($assignedSetIds) {
                $query->where('visibility', 'public');
                if ($assignedSetIds->isNotEmpty()) {
                    $query->orWhereIn('id', $assignedSetIds);
                }
            })
            ->orderByDesc('updated_at')
            ->limit(8)
            ->get();

        $recentSets = $sets->map(function ($set) {
            return [
                'id' => 'set-'.$set->id,
                'title' => $set->title,
                'cards' => (int) $set->cards_count,
                'updatedAt' => optional($set->updated_at)?->diffForHumans() ?? 'just now',
                'owner' => 'Teacher Content',
            ];
        })->values();

        if ($recentSets->isEmpty()) {
            $recentSets = collect([
                ['id' => 'set-1', 'title' => 'Biology: Cell Structure', 'cards' => 28, 'updatedAt' => '1 hour ago', 'owner' => 'Public Group'],
                ['id' => 'set-2', 'title' => 'Philippine Constitution Basics', 'cards' => 42, 'updatedAt' => 'Yesterday', 'owner' => 'Teacher Ana'],
            ]);
        }

        $progressRows = DB::table('student_progress')
            ->where('student_id', $studentId)
            ->orderByDesc('updated_at')
            ->get();

        $progressPercent = (int) round($progressRows->avg('completion_rate') ?? 72);
        $completionRate = (int) round($progressRows->avg('completion_rate') ?? 64);
        $studyStreak = (int) round($progressRows->max('streak_days') ?? 9);

        $sessionLogs = $progressRows->take(6)->map(function ($row, int $index) {
            return [
                'id' => 's-'.($index + 1),
                'date' => optional($row->updated_at)?->toDateString() ?? now()->toDateString(),
                'minutes' => (int) ($row->study_minutes ?? 40),
                'topic' => $row->weak_area ?: 'General Study',
                'score' => (int) ($row->last_score ?? 80),
            ];
        })->values();

        if ($sessionLogs->isEmpty()) {
            $sessionLogs = collect([
                ['id' => 's-1', 'date' => now()->subDays(2)->toDateString(), 'minutes' => 45, 'topic' => 'Biology', 'score' => 88],
                ['id' => 's-2', 'date' => now()->subDay()->toDateString(), 'minutes' => 35, 'topic' => 'Economics', 'score' => 76],
            ]);
        }

        $subjectPerformance = collect([
            ['subject' => 'Biology', 'score' => 88],
            ['subject' => 'Mathematics', 'score' => 91],
            ['subject' => 'Economics', 'score' => 72],
            ['subject' => 'Civics', 'score' => 84],
        ]);

        return response()->json([
            'progressPercent' => $progressPercent,
            'completionRate' => $completionRate,
            'studyStreak' => $studyStreak,
            'weeklyScores' => [
                ['day' => 'Mon', 'score' => 78],
                ['day' => 'Tue', 'score' => 82],
                ['day' => 'Wed', 'score' => 86],
                ['day' => 'Thu', 'score' => 79],
                ['day' => 'Fri', 'score' => 90],
                ['day' => 'Sat', 'score' => 92],
                ['day' => 'Sun', 'score' => 88],
            ],
            'weeklyProgress' => [
                ['week' => 'W1', 'completed' => 28],
                ['week' => 'W2', 'completed' => 36],
                ['week' => 'W3', 'completed' => 44],
                ['week' => 'W4', 'completed' => 58],
            ],
            'recentSets' => $recentSets,
            'sessionLogs' => $sessionLogs,
            'subjectPerformance' => $subjectPerformance,
        ]);
    }

    public function studentFlashcards(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'student')) {
            return $error;
        }

        $studentId = (int) $request->user()->id;

        $assignedSetIds = DB::table('study_set_assignments')
            ->where('student_id', $studentId)
            ->pluck('study_set_id');

        $cards = DB::table('flashcards')
            ->join('study_sets', 'study_sets.id', '=', 'flashcards.study_set_id')
            ->where(function ($query) use ($assignedSetIds) {
                $query->where('study_sets.visibility', 'public');
                if ($assignedSetIds->isNotEmpty()) {
                    $query->orWhereIn('study_sets.id', $assignedSetIds);
                }
            })
            ->orderByDesc('flashcards.updated_at')
            ->limit(30)
            ->get(['flashcards.id', 'flashcards.term', 'flashcards.definition', 'study_sets.subject'])
            ->map(fn ($card) => [
                'id' => 'card-'.$card->id,
                'term' => $card->term,
                'definition' => $card->definition,
                'subject' => $card->subject ?? 'General',
            ])
            ->values();

        if ($cards->isEmpty()) {
            $cards = collect([
                ['id' => 'card-1', 'term' => 'Mitochondria', 'definition' => 'Organelle that generates ATP via cellular respiration.', 'subject' => 'Biology'],
                ['id' => 'card-2', 'term' => 'Due Process', 'definition' => 'Requirement that legal matters be resolved fairly under established rules.', 'subject' => 'Civics'],
            ]);
        }

        return response()->json(['cards' => $cards]);
    }

    public function studentQuizQuestions(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'student')) {
            return $error;
        }

        $studentId = (int) $request->user()->id;

        $assignedSetIds = DB::table('study_set_assignments')
            ->where('student_id', $studentId)
            ->pluck('study_set_id');

        $quiz = DB::table('quizzes')
            ->join('study_sets', 'study_sets.id', '=', 'quizzes.study_set_id')
            ->where(function ($query) use ($assignedSetIds) {
                $query->where('study_sets.visibility', 'public');
                if ($assignedSetIds->isNotEmpty()) {
                    $query->orWhereIn('study_sets.id', $assignedSetIds);
                }
            })
            ->whereNotExists(function ($query) use ($studentId) {
                $query->select(DB::raw(1))
                    ->from('quiz_attempts')
                    ->whereColumn('quiz_attempts.quiz_id', 'quizzes.id')
                    ->where('quiz_attempts.student_id', $studentId);
            })
            ->orderByDesc('quizzes.updated_at')
            ->select('quizzes.id', 'quizzes.study_set_id')
            ->first();

        if (! $quiz) {
            return response()->json([
                'quizId' => null,
                'questions' => [],
                'completed' => true,
                'message' => 'All assigned quizzes are completed.',
            ]);
        }

        $subject = DB::table('study_sets')->where('id', $quiz->study_set_id)->value('subject') ?? 'General';

        $questions = DB::table('quiz_questions')
            ->where('quiz_id', $quiz->id)
            ->orderBy('id')
            ->get()
            ->map(function ($question) use ($subject) {
                return [
                    'id' => 'q-'.$question->id,
                    'type' => $question->question_type,
                    'subject' => $subject,
                    'prompt' => $question->prompt,
                    'choices' => $question->choices ? json_decode($question->choices, true) : null,
                    'answer' => $question->correct_answer,
                    'explanation' => $question->explanation ?? '',
                ];
            })
            ->values();

        return response()->json([
            'quizId' => (int) $quiz->id,
            'questions' => $questions,
        ]);
    }

    public function saveFlashcardProgress(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'student')) {
            return $error;
        }

        $validated = $request->validate([
            'cardId' => ['required', 'string'],
            'status' => ['required', 'in:known,review'],
        ]);

        $cardNumericId = (int) preg_replace('/[^0-9]/', '', $validated['cardId']);
        $studySetId = DB::table('flashcards')->where('id', $cardNumericId)->value('study_set_id');

        if ($studySetId) {
            // Get current progress before update
            $currentProgress = DB::table('student_progress')
                ->where('student_id', $request->user()->id)
                ->where('study_set_id', $studySetId)
                ->first();
            
            $previousCompletionRate = $currentProgress ? (int) $currentProgress->completion_rate : 0;
            
            DB::table('student_progress')->updateOrInsert(
                [
                    'student_id' => $request->user()->id,
                    'study_set_id' => $studySetId,
                ],
                [
                    'completion_rate' => DB::raw('LEAST(100, completion_rate + 2)'),
                    'weak_area' => $validated['status'] === 'review' ? 'Needs card review' : 'Consistent review',
                    'study_minutes' => DB::raw('study_minutes + 2'),
                    'last_score' => DB::raw('COALESCE(last_score, 70)'),
                    'streak_days' => DB::raw('COALESCE(streak_days, 0) + 1'),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );

            // Get updated progress
            $updatedProgress = DB::table('student_progress')
                ->where('student_id', $request->user()->id)
                ->where('study_set_id', $studySetId)
                ->first();
            
            $newCompletionRate = $updatedProgress ? (int) $updatedProgress->completion_rate : 0;
            
            // Notify teacher when student completes flashcard study (reaches 100%)
            if ($previousCompletionRate < 100 && $newCompletionRate >= 100) {
                $studySet = DB::table('study_sets')->find($studySetId);
                if ($studySet && $studySet->teacher_id) {
                    DB::table('notifications')->insert([
                        'user_id' => $studySet->teacher_id,
                        'created_by' => $request->user()->id,
                        'type' => 'teacher_alert',
                        'title' => 'Student completed flashcards',
                        'message' => $request->user()->name.' completed all flashcards in "'.$studySet->title.'".',
                        'payload' => json_encode([
                            'study_set_id' => $studySetId,
                            'student_id' => $request->user()->id,
                            'completion_rate' => 100,
                        ]),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            $rules = $this->gamificationRules();
            if ($validated['status'] === 'known') {
                $this->awardXp((int) $request->user()->id, (int) ($rules['flashcard_known_xp'] ?? 10), 'flashcard_known', ['cardId' => $cardNumericId]);
            }

            $streak = $this->syncStreak((int) $request->user()->id);
            if ($streak > 0 && $streak % 7 === 0) {
                $this->awardXp((int) $request->user()->id, (int) ($rules['streak_milestone_xp'] ?? 20), 'streak_milestone', ['streak' => $streak]);
            }
        }

        return response()->json(['message' => 'Progress saved.']);
    }

    public function submitQuiz(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'student')) {
            return $error;
        }

        $validated = $request->validate([
            'quizId' => ['nullable', 'integer'],
            'answers' => ['required', 'array'],
        ]);

        $quizId = $validated['quizId'] ?? (int) DB::table('quizzes')->orderByDesc('updated_at')->value('id');

        if (! $quizId) {
            return response()->json(['message' => 'No quiz available.'], 404);
        }

        $questions = DB::table('quiz_questions')->where('quiz_id', $quizId)->get();

        $correct = 0;
        foreach ($questions as $question) {
            $key = 'q-'.$question->id;
            $submitted = strtolower(trim((string) ($validated['answers'][$key] ?? '')));
            $answer = strtolower(trim((string) $question->correct_answer));
            if ($submitted !== '' && $submitted === $answer) {
                $correct += 1;
            }
        }

        $score = $questions->count() > 0 ? (int) round(($correct / $questions->count()) * 100) : 0;
        $studySetId = (int) (DB::table('quizzes')->where('id', $quizId)->value('study_set_id') ?? 0);

        DB::table('quiz_attempts')->insert([
            'quiz_id' => $quizId,
            'study_set_id' => $studySetId ?: null,
            'student_id' => $request->user()->id,
            'score' => $score,
            'answers' => json_encode($validated['answers']),
            'completed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($studySetId > 0) {
            DB::table('student_progress')->updateOrInsert(
                [
                    'student_id' => $request->user()->id,
                    'study_set_id' => $studySetId,
                ],
                [
                    'completion_rate' => DB::raw('LEAST(100, COALESCE(completion_rate, 0) + 10)'),
                    'last_score' => $score,
                    'study_minutes' => DB::raw('COALESCE(study_minutes, 0) + 15'),
                    'weak_area' => $score < 75 ? 'Quiz performance' : 'Stable',
                    'streak_days' => DB::raw('COALESCE(streak_days, 0) + 1'),
                    'last_studied_at' => now(),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );

            $teacherId = DB::table('study_sets')->where('id', $studySetId)->value('teacher_id');
            if ($teacherId) {
                DB::table('notifications')->insert([
                    'user_id' => $teacherId,
                    'created_by' => $request->user()->id,
                    'type' => 'teacher_alert',
                    'title' => 'Student completed quiz',
                    'message' => $request->user()->name.' completed a quiz with '.$score.'%.',
                    'payload' => json_encode(['score' => $score, 'study_set_id' => $studySetId]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        $this->updateStudentAchievements((int) $request->user()->id, $score);

        $rules = $this->gamificationRules();
        $earned = (int) ($rules['quiz_completion_xp'] ?? 25);
        if ($score === 100) {
            $earned += (int) ($rules['perfect_score_bonus_xp'] ?? 30);
        }
        $xpSnapshot = $this->awardXp((int) $request->user()->id, $earned, 'quiz_completion', ['score' => $score]);
        $this->syncStreak((int) $request->user()->id);

        DB::table('notifications')->insert([
            'user_id' => $request->user()->id,
            'created_by' => $request->user()->id,
            'type' => 'quiz_result',
            'title' => 'Quiz submitted',
            'message' => 'You scored '.$score.'% on your latest quiz.',
            'payload' => json_encode(['score' => $score]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Quiz submitted successfully.',
            'score' => $score,
            'xp' => $xpSnapshot,
        ]);
    }

    public function gamificationMe(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'student')) {
            return $error;
        }

        $userId = (int) $request->user()->id;
        $rules = $this->gamificationRules();
        $points = DB::table('user_points')->where('user_id', $userId)->first();

        if (! $points) {
            $this->awardXp($userId, 0, 'bootstrap');
            $points = DB::table('user_points')->where('user_id', $userId)->first();
        }

        if (! $points->last_daily_login_at || (string) $points->last_daily_login_at !== now()->toDateString()) {
            $this->awardXp($userId, (int) ($rules['daily_login_xp'] ?? 15), 'daily_login');
            DB::table('user_points')->where('user_id', $userId)->update(['last_daily_login_at' => now()->toDateString(), 'updated_at' => now()]);
            $points = DB::table('user_points')->where('user_id', $userId)->first();
        }

        $this->syncStreak($userId);
        $this->syncGamificationBadges($userId);

        $step = max(1, (int) ($rules['level_step_xp'] ?? 120));
        $level = (int) $points->level;
        $levelFloorXp = $this->xpForLevel($level - 1, $step);
        $levelCeilXp = $this->xpForLevel($level, $step);

        $rank = (int) (DB::table('leaderboard')->where('scope', 'global')->where('user_id', $userId)->value('rank') ?? 0);
        $streak = (int) (DB::table('streaks')->where('user_id', $userId)->value('streak_count') ?? 0);

        return response()->json([
            'xp' => (int) $points->xp,
            'level' => $level,
            'title' => $points->title,
            'totalPoints' => (int) $points->total_points,
            'xpToNextLevel' => max(0, $levelCeilXp - (int) $points->xp),
            'levelProgressPercent' => (int) round((((int) $points->xp - $levelFloorXp) / max(1, ($levelCeilXp - $levelFloorXp))) * 100),
            'streak' => $streak,
            'rank' => $rank,
        ]);
    }

    public function gamificationLeaderboard(Request $request): JsonResponse
    {
        if (! $request->user()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $scope = $request->query('scope', 'weekly') === 'global' ? 'global' : 'weekly';
        $weekKey = now()->format('o-W');

        $rows = DB::table('leaderboard')
            ->join('users', 'users.id', '=', 'leaderboard.user_id')
            ->when($scope === 'weekly', fn ($query) => $query->where('leaderboard.week_key', $weekKey))
            ->where('leaderboard.scope', $scope)
            ->orderBy('leaderboard.rank')
            ->limit(10)
            ->get(['leaderboard.user_id', 'leaderboard.score', 'leaderboard.rank', 'users.name']);

        $list = $rows->map(fn ($row) => [
            'userId' => (int) $row->user_id,
            'name' => $row->name,
            'score' => (int) $row->score,
            'rank' => (int) $row->rank,
        ])->values();

        $myRank = DB::table('leaderboard')
            ->where('scope', $scope)
            ->when($scope === 'weekly', fn ($query) => $query->where('week_key', $weekKey))
            ->where('user_id', $request->user()->id)
            ->value('rank');

        return response()->json([
            'scope' => $scope,
            'leaders' => $list,
            'myRank' => (int) ($myRank ?? 0),
        ]);
    }

    public function gamificationBadges(Request $request): JsonResponse
    {
        if (! $request->user()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $badges = DB::table('badges')
            ->leftJoin('user_badges', function ($join) use ($request) {
                $join->on('user_badges.badge_id', '=', 'badges.id')
                    ->where('user_badges.user_id', '=', $request->user()->id);
            })
            ->get([
                'badges.id',
                'badges.code',
                'badges.name',
                'badges.description',
                'badges.requirement_value',
                'badges.xp_reward',
                'user_badges.progress',
                'user_badges.date_earned',
            ])
            ->map(fn ($badge) => [
                'id' => $badge->code,
                'title' => $badge->name,
                'description' => $badge->description,
                'required' => (int) $badge->requirement_value,
                'progress' => (int) ($badge->progress ?? 0),
                'xpReward' => (int) $badge->xp_reward,
                'earned' => ! is_null($badge->date_earned),
            ])
            ->values();

        return response()->json(['badges' => $badges]);
    }

    public function gamificationEarnXp(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'student')) {
            return $error;
        }

        $validated = $request->validate([
            'source' => ['required', 'string', 'max:80'],
            'xp' => ['required', 'integer', 'min:0', 'max:500'],
            'meta' => ['nullable', 'array'],
        ]);

        $snapshot = $this->awardXp((int) $request->user()->id, (int) $validated['xp'], $validated['source'], $validated['meta'] ?? []);

        return response()->json(['message' => 'XP awarded.', 'snapshot' => $snapshot]);
    }

    public function adminGamificationDashboard(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $totalXp = (int) DB::table('user_points')->sum('xp');
        $activeStudents = (int) DB::table('gamification_events')->whereBetween('created_at', [now()->subDays(7), now()])->distinct('user_id')->count('user_id');
        $badgeDistribution = DB::table('user_badges')
            ->join('badges', 'badges.id', '=', 'user_badges.badge_id')
            ->whereNotNull('user_badges.date_earned')
            ->groupBy('badges.name')
            ->selectRaw('badges.name as badge, COUNT(user_badges.id) as count')
            ->get();

        $engagementTrend = DB::table('gamification_events')
            ->whereBetween('created_at', [now()->subDays(6)->startOfDay(), now()->endOfDay()])
            ->selectRaw('DATE(created_at) as day, COUNT(id) as events, SUM(xp_delta) as xp')
            ->groupByRaw('DATE(created_at)')
            ->orderBy('day')
            ->get()
            ->map(fn ($row) => [
                'day' => $row->day,
                'events' => (int) $row->events,
                'xp' => (int) $row->xp,
            ])
            ->values();

        $mostActive = DB::table('gamification_events')
            ->join('users', 'users.id', '=', 'gamification_events.user_id')
            ->groupBy('users.id', 'users.name')
            ->selectRaw('users.id, users.name, COUNT(gamification_events.id) as activityCount, SUM(gamification_events.xp_delta) as xp')
            ->orderByDesc('activityCount')
            ->limit(10)
            ->get();

        $leaders = DB::table('leaderboard')
            ->join('users', 'users.id', '=', 'leaderboard.user_id')
            ->where('leaderboard.scope', 'global')
            ->orderBy('leaderboard.rank')
            ->limit(10)
            ->get(['users.name', 'leaderboard.rank', 'leaderboard.score']);

        return response()->json([
            'totals' => [
                'xp' => $totalXp,
                'activeStudents' => $activeStudents,
                'engagementRate' => $activeStudents > 0 ? min(100, (int) round(($activeStudents / max(1, DB::table('users')->where('role', 'student')->count())) * 100)) : 0,
                'retentionRate' => min(100, (int) round(((int) DB::table('streaks')->where('streak_count', '>=', 3)->count() / max(1, DB::table('users')->where('role', 'student')->count())) * 100)),
            ],
            'badgeDistribution' => $badgeDistribution,
            'engagementTrend' => $engagementTrend,
            'mostActiveStudents' => $mostActive,
            'leaderboard' => $leaders,
            'rules' => $this->gamificationRules(),
        ]);
    }

    public function adminBadges(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $badges = DB::table('badges')->orderBy('name')->get();

        return response()->json(['badges' => $badges]);
    }

    public function createAdminBadge(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:80', 'unique:badges,code'],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'requirementType' => ['required', 'string', 'max:80'],
            'requirementValue' => ['required', 'integer', 'min:1'],
            'xpReward' => ['required', 'integer', 'min:0'],
        ]);

        $id = DB::table('badges')->insertGetId([
            'code' => $validated['code'],
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'requirement_type' => $validated['requirementType'],
            'requirement_value' => $validated['requirementValue'],
            'xp_reward' => $validated['xpReward'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Badge created.', 'id' => $id], 201);
    }

    public function updateAdminBadge(Request $request, int $badgeId): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string'],
            'requirementType' => ['required', 'string', 'max:80'],
            'requirementValue' => ['required', 'integer', 'min:1'],
            'xpReward' => ['required', 'integer', 'min:0'],
        ]);

        DB::table('badges')->where('id', $badgeId)->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'requirement_type' => $validated['requirementType'],
            'requirement_value' => $validated['requirementValue'],
            'xp_reward' => $validated['xpReward'],
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Badge updated.']);
    }

    public function updateGamificationRules(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $validated = $request->validate([
            'rules' => ['required', 'array'],
        ]);

        foreach ($validated['rules'] as $key => $value) {
            DB::table('gamification_rules')->updateOrInsert(
                ['rule_key' => (string) $key],
                ['rule_value' => (int) $value, 'updated_at' => now(), 'created_at' => now()]
            );
        }

        return response()->json(['message' => 'Rules updated.', 'rules' => $this->gamificationRules()]);
    }

    public function resetGamificationUser(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $validated = $request->validate([
            'studentId' => ['required', 'integer', 'exists:users,id'],
        ]);

        $studentId = (int) $validated['studentId'];

        DB::table('user_points')->where('user_id', $studentId)->update([
            'xp' => 0,
            'level' => 1,
            'title' => 'Beginner',
            'updated_at' => now(),
        ]);

        DB::table('streaks')->where('user_id', $studentId)->update([
            'streak_count' => 0,
            'updated_at' => now(),
        ]);

        DB::table('user_badges')->where('user_id', $studentId)->update([
            'progress' => 0,
            'date_earned' => null,
            'updated_at' => now(),
        ]);

        $this->syncLeaderboardRow($studentId);

        return response()->json(['message' => 'Student gamification stats reset.']);
    }

    private function updateStudentAchievements(int $studentId, int $latestScore): void
    {
        $achievements = DB::table('achievements')->get();

        foreach ($achievements as $achievement) {
            $progress = match ($achievement->code) {
                'quiz-champion' => $latestScore,
                'perfect-score' => $latestScore,
                'study-streak' => (int) (DB::table('student_progress')->where('student_id', $studentId)->max('streak_days') ?? 0),
                default => (int) (DB::table('student_progress')->where('student_id', $studentId)->count() * 2),
            };

            $awardedAt = $progress >= (int) $achievement->target_value ? now() : null;

            DB::table('student_achievements')->updateOrInsert(
                [
                    'student_id' => $studentId,
                    'achievement_id' => $achievement->id,
                ],
                [
                    'progress' => $progress,
                    'awarded_at' => $awardedAt,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );

            if (! is_null($awardedAt)) {
                DB::table('notifications')->insert([
                    'user_id' => $studentId,
                    'created_by' => $studentId,
                    'type' => 'badge_earned',
                    'title' => 'Badge earned',
                    'message' => 'You earned '.$achievement->name.'.',
                    'payload' => json_encode(['achievement' => $achievement->code]),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function studentAchievements(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'student')) {
            return $error;
        }

        $items = DB::table('student_achievements')
            ->join('achievements', 'achievements.id', '=', 'student_achievements.achievement_id')
            ->where('student_achievements.student_id', $request->user()->id)
            ->select('achievements.code', 'achievements.name', 'achievements.description', 'student_achievements.progress', 'achievements.target_value as required', 'student_achievements.awarded_at')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->code,
                'title' => $row->name,
                'description' => $row->description,
                'progress' => (int) $row->progress,
                'required' => (int) $row->required,
                'awarded' => ! is_null($row->awarded_at),
            ])
            ->values();

        return response()->json(['badges' => $items]);
    }

    public function studentNotifications(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'student')) {
            return $error;
        }

        $items = DB::table('notifications')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'type', 'title', 'message', 'read_at', 'created_at'])
            ->map(fn ($row) => [
                'id' => (string) $row->id,
                'type' => $row->type,
                'title' => $row->title,
                'message' => $row->message,
                'read' => ! is_null($row->read_at),
                'createdAt' => optional($row->created_at)?->toISOString(),
            ])
            ->values();

        return response()->json(['notifications' => $items]);
    }

    public function markStudentNotificationsRead(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'student')) {
            return $error;
        }

        $validated = $request->validate([
            'type' => ['nullable', 'in:announcement,assignment'],
        ]);

        $query = DB::table('notifications')
            ->where('user_id', $request->user()->id)
            ->whereNull('read_at');

        if (! empty($validated['type'])) {
            $query->where('type', $validated['type']);
        }

        $updated = $query->update([
            'read_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Notifications marked as read.',
            'updated' => $updated,
        ]);
    }

    public function deleteStudentNotification(Request $request, int $notificationId): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'student')) {
            return $error;
        }

        $deleted = DB::table('notifications')
            ->where('id', $notificationId)
            ->where('user_id', $request->user()->id)
            ->delete();

        if ($deleted === 0) {
            return response()->json(['message' => 'Notification not found.'], 404);
        }

        return response()->json(['message' => 'Notification deleted.']);
    }

    public function studentClassMaterials(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'student')) {
            return $error;
        }

        // Get classes the student is enrolled in
        $studentClassIds = DB::table('class_students')
            ->where('student_id', $request->user()->id)
            ->pluck('class_id');

        // Get study guides for those classes
        $materials = DB::table('study_guides')
            ->join('users as teachers', 'study_guides.teacher_id', '=', 'teachers.id')
            ->leftJoin('classes', 'study_guides.class_id', '=', 'classes.id')
            ->whereIn('study_guides.class_id', $studentClassIds)
            ->orderByDesc('study_guides.updated_at')
            ->get([
                'study_guides.id',
                'study_guides.title',
                'study_guides.subject',
                'study_guides.content',
                'study_guides.upload_type',
                'study_guides.file_path',
                'study_guides.updated_at',
                'teachers.name as teacher_name',
                'classes.name as class_name',
            ])
            ->map(fn ($row) => [
                'id' => (string) $row->id,
                'title' => $row->title ?? 'Untitled Material',
                'description' => $row->content ? substr($row->content, 0, 100) : 'No description provided.',
                'type' => $row->subject ?? 'Study Material',
                'uploadedBy' => $row->teacher_name ?? 'Teacher',
                'uploadedAt' => optional($row->updated_at)?->format('M d, Y') ?? 'Unknown date',
                'fileUrl' => $row->file_path ? '/storage/' . $row->file_path : null,
                'className' => $row->class_name ?? null,
            ])
            ->values();

        return response()->json(['materials' => $materials]);
    }

    public function studentClassMembers(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'student')) {
            return $error;
        }

        $studentId = $request->user()->id;

        // Get classes the student is enrolled in
        $studentClassIds = DB::table('class_students')
            ->where('student_id', $studentId)
            ->pluck('class_id');

        if ($studentClassIds->isEmpty()) {
            return response()->json(['members' => []]);
        }

        // Get all students in those classes
        $members = DB::table('class_students')
            ->join('users', 'class_students.student_id', '=', 'users.id')
            ->whereIn('class_students.class_id', $studentClassIds)
            ->where('users.role', 'student')
            ->select('users.id', 'users.name', 'users.profile_image_path')
            ->distinct()
            ->orderBy('users.name')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => (string) $user->id,
                    'name' => $user->name,
                    'avatar' => $user->profile_image_path,
                    'isOnline' => false, // Can be enhanced with real online status
                ];
            })
            ->values();

        return response()->json(['members' => $members]);
    }

    public function awardBadge(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $validated = $request->validate([
            'studentId' => ['required', 'integer', 'exists:users,id'],
            'badgeCode' => ['required', 'string'],
        ]);

        $achievement = DB::table('achievements')->where('code', $validated['badgeCode'])->first();
        if (! $achievement) {
            return response()->json(['message' => 'Badge not found.'], 404);
        }

        DB::table('student_achievements')->updateOrInsert(
            [
                'student_id' => $validated['studentId'],
                'achievement_id' => $achievement->id,
            ],
            [
                'progress' => (int) $achievement->target_value,
                'awarded_at' => now(),
                'awarded_by' => $request->user()->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        DB::table('notifications')->insert([
            'user_id' => $validated['studentId'],
            'created_by' => $request->user()->id,
            'type' => 'badge_earned',
            'title' => 'Badge awarded by teacher',
            'message' => 'You received '.$achievement->name.'.',
            'payload' => json_encode(['achievement' => $achievement->code]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Badge awarded successfully.']);
    }

    public function teacherReports(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $teacherId = (int) $request->user()->id;

        // Get class performance from practice tests
        $testPerformance = DB::table('practice_test_attempts')
            ->join('practice_tests', 'practice_tests.id', '=', 'practice_test_attempts.practice_test_id')
            ->where('practice_tests.teacher_id', $teacherId)
            ->whereNotNull('practice_tests.class_name')
            ->groupBy('practice_tests.class_name', 'practice_tests.subject')
            ->selectRaw('
                practice_tests.class_name as className,
                practice_tests.subject,
                AVG(practice_test_attempts.score_percentage) as averageScore,
                COUNT(DISTINCT practice_test_attempts.student_id) as submitted_students
            ')
            ->get();

        $classPerformance = $testPerformance->map(function ($row) {
            return [
                'className' => $row->className ?: 'Unknown',
                'subject' => $row->subject,
                'averageScore' => (int) round((float) $row->averageScore),
                'completionRate' => 100, // We don't have total students per class name
            ];
        })->values();

        // Get overall statistics from practice tests
        $overallTestStats = DB::table('practice_test_attempts')
            ->join('practice_tests', 'practice_tests.id', '=', 'practice_test_attempts.practice_test_id')
            ->where('practice_tests.teacher_id', $teacherId)
            ->selectRaw('
                COALESCE(AVG(practice_test_attempts.score_percentage), 0) as average_score,
                COUNT(DISTINCT practice_test_attempts.student_id) as submitted_students,
                COUNT(practice_test_attempts.id) as total_attempts
            ')
            ->first();

        // Get overall statistics from quizzes
        $overallQuizStats = DB::table('quiz_attempts')
            ->join('quizzes', 'quizzes.id', '=', 'quiz_attempts.quiz_id')
            ->join('study_sets', 'study_sets.id', '=', 'quizzes.study_set_id')
            ->where('study_sets.teacher_id', $teacherId)
            ->selectRaw('
                COALESCE(AVG(quiz_attempts.score), 0) as average_score,
                COUNT(DISTINCT quiz_attempts.student_id) as submitted_students,
                COUNT(quiz_attempts.id) as total_attempts
            ')
            ->first();

        // Combine statistics
        $testScore = (float) ($overallTestStats->average_score ?? 0);
        $quizScore = (float) ($overallQuizStats->average_score ?? 0);
        $testCount = (int) ($overallTestStats->total_attempts ?? 0);
        $quizCount = (int) ($overallQuizStats->total_attempts ?? 0);
        
        $combinedScore = 0;
        if ($testCount > 0 && $quizCount > 0) {
            $combinedScore = (($testScore * $testCount) + ($quizScore * $quizCount)) / ($testCount + $quizCount);
        } elseif ($testCount > 0) {
            $combinedScore = $testScore;
        } elseif ($quizCount > 0) {
            $combinedScore = $quizScore;
        }

        $topicDifficulty = DB::table('quiz_questions')
            ->join('quizzes', 'quizzes.id', '=', 'quiz_questions.quiz_id')
            ->join('study_sets', 'study_sets.id', '=', 'quizzes.study_set_id')
            ->leftJoin('quiz_attempts', 'quiz_attempts.quiz_id', '=', 'quizzes.id')
            ->where('study_sets.teacher_id', $teacherId)
            ->groupBy('study_sets.subject')
            ->selectRaw('study_sets.subject as topic, COALESCE(AVG(quiz_attempts.score), 0) as averageScore, COUNT(quiz_attempts.id) as attempts')
            ->orderBy('averageScore')
            ->limit(6)
            ->get()
            ->map(fn ($row) => [
                'topic' => $row->topic ?: 'General',
                'averageScore' => (int) round((float) $row->averageScore),
                'attempts' => (int) $row->attempts,
            ])
            ->values();

        $averageScore = $classPerformance->isNotEmpty() 
            ? (int) round($classPerformance->avg('averageScore') ?? 0) 
            : (int) round($combinedScore);

        $completionRate = $classPerformance->isNotEmpty() 
            ? (int) round($classPerformance->avg('completionRate') ?? 0) 
            : 0;

        return response()->json([
            'classPerformance' => $classPerformance,
            'topicDifficulty' => $topicDifficulty,
            'averageScore' => $averageScore,
            'completionRate' => $completionRate,
        ]);
    }

    public function listClasses(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $classes = DB::table('classes')
            ->where('teacher_id', $request->user()->id)
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'subject', 'description', 'created_at', 'updated_at'])
            ->map(function ($class) {
                $studentsCount = (int) DB::table('class_students')->where('class_id', $class->id)->count();
                return [
                    'id' => (int) $class->id,
                    'name' => $class->name,
                    'subject' => $class->subject,
                    'description' => $class->description,
                    'studentsCount' => $studentsCount,
                    'updatedAt' => optional($class->updated_at)?->diffForHumans() ?? 'just now',
                ];
            })
            ->values();

        return response()->json(['classes' => $classes]);
    }

    public function createClass(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $classId = DB::table('classes')->insertGetId([
            'teacher_id' => $request->user()->id,
            'name' => $validated['name'],
            'subject' => $validated['subject'],
            'description' => $validated['description'] ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Class created.', 'classId' => $classId], 201);
    }

    public function updateClass(Request $request, int $classId): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $ownsClass = DB::table('classes')
            ->where('id', $classId)
            ->where('teacher_id', $request->user()->id)
            ->exists();

        if (! $ownsClass) {
            return response()->json(['message' => 'Class not found.'], 404);
        }

        DB::table('classes')
            ->where('id', $classId)
            ->update([
                'name' => $validated['name'],
                'subject' => $validated['subject'],
                'description' => $validated['description'] ?? null,
                'updated_at' => now(),
            ]);

        return response()->json(['message' => 'Class updated.']);
    }

    public function deleteClass(Request $request, int $classId): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $ownsClass = DB::table('classes')
            ->where('id', $classId)
            ->where('teacher_id', $request->user()->id)
            ->exists();

        if (! $ownsClass) {
            return response()->json(['message' => 'Class not found.'], 404);
        }

        // Delete related class students first
        DB::table('class_students')->where('class_id', $classId)->delete();

        // Delete the class
        DB::table('classes')->where('id', $classId)->delete();

        return response()->json(['message' => 'Class deleted.']);
    }

    public function addClassStudent(Request $request, int $classId): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $validated = $request->validate([
            'studentId' => ['required', 'integer', 'exists:users,id'],
        ]);

        $isStudent = DB::table('users')
            ->where('id', $validated['studentId'])
            ->where('role', 'student')
            ->exists();

        if (! $isStudent) {
            return response()->json(['message' => 'Only student accounts can be added to a class.'], 422);
        }

        $exists = DB::table('classes')->where('id', $classId)->where('teacher_id', $request->user()->id)->exists();
        if (! $exists) {
            return response()->json(['message' => 'Class not found.'], 404);
        }

        DB::table('class_students')->updateOrInsert(
            ['class_id' => $classId, 'student_id' => $validated['studentId']],
            ['created_at' => now(), 'updated_at' => now()]
        );

        return response()->json(['message' => 'Student added to class.']);
    }

    public function removeClassStudent(Request $request, int $classId, int $studentId): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $ownsClass = DB::table('classes')->where('id', $classId)->where('teacher_id', $request->user()->id)->exists();
        if (! $ownsClass) {
            return response()->json(['message' => 'Class not found.'], 404);
        }

        DB::table('class_students')
            ->where('class_id', $classId)
            ->where('student_id', $studentId)
            ->delete();

        return response()->json(['message' => 'Student removed from class.']);
    }

    public function listStudyGuides(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $guides = DB::table('study_guides')
            ->leftJoin('classes', 'study_guides.class_id', '=', 'classes.id')
            ->where('study_guides.teacher_id', $request->user()->id)
            ->orderByDesc('study_guides.updated_at')
            ->select([
                'study_guides.id', 
                'study_guides.title', 
                'study_guides.subject', 
                'study_guides.content', 
                'study_guides.image_url', 
                'study_guides.visibility',
                'study_guides.upload_type',
                'study_guides.file_path',
                'study_guides.class_id',
                'study_guides.updated_at',
                'classes.name as class_name'
            ])
            ->get()
            ->map(fn ($guide) => [
                'id' => (int) $guide->id,
                'title' => $guide->title,
                'subject' => $guide->subject,
                'content' => $guide->content,
                'imageUrl' => $guide->image_url,
                'visibility' => $guide->visibility,
                'uploadType' => $guide->upload_type,
                'filePath' => $guide->file_path ? '/storage/' . $guide->file_path : null,
                'classId' => $guide->class_id,
                'className' => $guide->class_name,
                'updatedAt' => optional($guide->updated_at)?->diffForHumans() ?? 'just now',
            ])
            ->values();

        return response()->json(['studyGuides' => $guides]);
    }

    public function createStudyGuide(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'classId' => ['required', 'integer', 'exists:classes,id'],
            'visibility' => ['nullable', 'in:public,private'],
            'uploadType' => ['required', 'in:pdf,powerpoint,text'],
            'textContent' => ['required_if:uploadType,text', 'string'],
            'file' => ['required_unless:uploadType,text', 'file', 'mimes:pdf,ppt,pptx', 'max:10240'],
        ]);

        $filePath = null;
        $content = '';

        // Handle file upload
        if ($validated['uploadType'] !== 'text' && $request->hasFile('file')) {
            $file = $request->file('file');
            $fileName = time() . '_' . $file->getClientOriginalName();
            $filePath = $file->storeAs('lessons', $fileName, 'public');
        } else {
            // For text content
            $content = $validated['textContent'] ?? '';
        }

        $id = DB::table('study_guides')->insertGetId([
            'teacher_id' => $request->user()->id,
            'class_id' => $validated['classId'],
            'title' => $validated['title'],
            'subject' => $validated['subject'],
            'visibility' => $validated['visibility'] ?? 'public',
            'upload_type' => $validated['uploadType'],
            'file_path' => $filePath,
            'content' => $content,
            'image_url' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Study guide created.', 'id' => $id], 201);
    }

    public function deleteStudyGuide(Request $request, int $guideId): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        DB::table('study_guides')->where('id', $guideId)->where('teacher_id', $request->user()->id)->delete();

        return response()->json(['message' => 'Study guide deleted.']);
    }

    public function createAssignment(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $validated = $request->validate([
            'classId' => ['nullable', 'integer'],
            'materialType' => ['required', 'in:study_guide,study_set,quiz'],
            'materialId' => ['required', 'integer'],
            'deadlineAt' => ['nullable', 'date'],
        ]);

        $assignmentId = DB::table('assignments')->insertGetId([
            'teacher_id' => $request->user()->id,
            'class_id' => $validated['classId'] ?? null,
            'material_type' => $validated['materialType'],
            'material_id' => $validated['materialId'],
            'deadline_at' => $validated['deadlineAt'] ?? null,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $studentIds = collect();
        if (! empty($validated['classId'])) {
            $studentIds = DB::table('class_students')->where('class_id', $validated['classId'])->pluck('student_id');
        } else {
            $studentIds = DB::table('users')->where('role', 'student')->limit(50)->pluck('id');
        }

        foreach ($studentIds as $studentId) {
            DB::table('notifications')->insert([
                'user_id' => $studentId,
                'created_by' => $request->user()->id,
                'type' => 'assignment',
                'title' => 'New assignment posted',
                'message' => 'A new '.$validated['materialType'].' has been assigned.',
                'payload' => json_encode(['assignmentId' => $assignmentId]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Assignment created.', 'assignmentId' => $assignmentId], 201);
    }

    public function listAssignments(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $assignments = DB::table('assignments')
            ->leftJoin('classes', 'classes.id', '=', 'assignments.class_id')
            ->where('assignments.teacher_id', $request->user()->id)
            ->orderByDesc('assignments.updated_at')
            ->get([
                'assignments.id',
                'assignments.material_type',
                'assignments.material_id',
                'assignments.deadline_at',
                'assignments.status',
                'classes.name as class_name',
            ])
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'materialType' => $row->material_type,
                'materialId' => (int) $row->material_id,
                'className' => $row->class_name ?? 'All Students',
                'deadlineAt' => $row->deadline_at,
                'status' => $row->status,
            ])
            ->values();

        return response()->json(['assignments' => $assignments]);
    }

    public function markNotification(Request $request, int $notificationId): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $validated = $request->validate([
            'read' => ['required', 'boolean'],
        ]);

        DB::table('notifications')
            ->where('id', $notificationId)
            ->where('user_id', $request->user()->id)
            ->update([
                'read_at' => $validated['read'] ? now() : null,
                'updated_at' => now(),
            ]);

        return response()->json(['message' => 'Notification status updated.']);
    }

    public function sendAnnouncement(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'teacher')) {
            return $error;
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string'],
            'classId' => ['nullable', 'integer'],
        ]);

        $students = collect();
        if (! empty($validated['classId'])) {
            $students = DB::table('class_students')->where('class_id', $validated['classId'])->pluck('student_id');
        } else {
            $students = DB::table('users')->where('role', 'student')->pluck('id');
        }

        foreach ($students as $studentId) {
            DB::table('notifications')->insert([
                'user_id' => $studentId,
                'created_by' => $request->user()->id,
                'type' => 'announcement',
                'title' => $validated['title'],
                'message' => $validated['message'],
                'payload' => empty($validated['classId']) ? null : json_encode(['classId' => $validated['classId']]),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Announcement sent.']);
    }

    public function studentActivities(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'student')) {
            return $error;
        }

        $studentId = $request->user()->id;

        // Get activities assigned to this student through classes OR direct assignments
        $activities = DB::table('study_sets')
            ->leftJoin('classes', 'study_sets.class_id', '=', 'classes.id')
            ->leftJoin('class_students', function($join) use ($studentId) {
                $join->on('classes.id', '=', 'class_students.class_id')
                     ->where('class_students.student_id', '=', $studentId);
            })
            ->leftJoin('study_set_assignments', function($join) use ($studentId) {
                $join->on('study_sets.id', '=', 'study_set_assignments.study_set_id')
                     ->where('study_set_assignments.student_id', '=', $studentId);
            })
            ->leftJoin('users as teachers', 'study_sets.teacher_id', '=', 'teachers.id')
            ->where('study_sets.is_published', true)
            ->where(function($query) {
                $query->whereNotNull('class_students.student_id')
                      ->orWhereNotNull('study_set_assignments.id');
            })
            ->select(
                'study_sets.id',
                'study_sets.title',
                'study_sets.description',
                'study_sets.subject',
                'study_sets.schedule',
                'study_sets.cards_count',
                'study_sets.created_at',
                'study_sets.updated_at',
                'classes.name as class_name',
                'teachers.name as teacher_name'
            )
            ->distinct()
            ->orderByDesc('study_sets.created_at')
            ->get()
            ->map(function ($activity) use ($studentId) {
                // Count flashcards
                $flashcardsCount = (int) DB::table('flashcards')
                    ->where('study_set_id', $activity->id)
                    ->count();

                // Count quiz questions
                $quizQuestionsCount = (int) DB::table('quiz_questions')
                    ->join('quizzes', 'quiz_questions.quiz_id', '=', 'quizzes.id')
                    ->where('quizzes.study_set_id', $activity->id)
                    ->count();

                // Check if student has attempted this activity
                $hasAttempted = DB::table('quiz_attempts')
                    ->where('study_set_id', $activity->id)
                    ->where('student_id', $studentId)
                    ->exists();

                return [
                    'id' => (int) $activity->id,
                    'title' => $activity->title,
                    'description' => $activity->description,
                    'subject' => $activity->subject,
                    'schedule' => $activity->schedule,
                    'className' => $activity->class_name,
                    'teacherName' => $activity->teacher_name,
                    'flashcardsCount' => $flashcardsCount,
                    'quizQuestionsCount' => $quizQuestionsCount,
                    'hasAttempted' => $hasAttempted,
                    'createdAt' => $activity->created_at,
                    'updatedAt' => $activity->updated_at,
                ];
            });

        return response()->json(['activities' => $activities]);
    }

    public function debugStudentActivities(Request $request): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'student')) {
            return $error;
        }

        $studentId = $request->user()->id;

        // Check student's classes
        $studentClasses = DB::table('class_students')
            ->join('classes', 'class_students.class_id', '=', 'classes.id')
            ->where('class_students.student_id', $studentId)
            ->select('classes.id', 'classes.name', 'classes.subject')
            ->get();

        // Check all published study sets
        $allStudySets = DB::table('study_sets')
            ->where('is_published', true)
            ->select('id', 'title', 'class_id', 'teacher_id')
            ->get();

        // Check direct assignments
        $directAssignments = DB::table('study_set_assignments')
            ->where('student_id', $studentId)
            ->get();

        return response()->json([
            'studentId' => $studentId,
            'enrolledClasses' => $studentClasses,
            'allPublishedStudySets' => $allStudySets,
            'directAssignments' => $directAssignments,
        ]);
    }

    public function getActivityDetails(Request $request, int $activityId): JsonResponse
    {
        if ($error = $this->ensureRole($request, 'student')) {
            return $error;
        }

        $studentId = $request->user()->id;

        // Check if student has access to this activity (through class or direct assignment)
        $hasAccess = DB::table('study_sets')
            ->leftJoin('classes', 'study_sets.class_id', '=', 'classes.id')
            ->leftJoin('class_students', function($join) use ($studentId) {
                $join->on('classes.id', '=', 'class_students.class_id')
                     ->where('class_students.student_id', '=', $studentId);
            })
            ->leftJoin('study_set_assignments', function($join) use ($studentId) {
                $join->on('study_sets.id', '=', 'study_set_assignments.study_set_id')
                     ->where('study_set_assignments.student_id', '=', $studentId);
            })
            ->where('study_sets.id', $activityId)
            ->where('study_sets.is_published', true)
            ->where(function($query) {
                $query->whereNotNull('class_students.student_id')
                      ->orWhereNotNull('study_set_assignments.id');
            })
            ->exists();

        if (!$hasAccess) {
            return response()->json(['message' => 'Activity not found or access denied.'], 404);
        }

        $activity = DB::table('study_sets')->where('id', $activityId)->first();

        // Get flashcards
        $flashcards = DB::table('flashcards')
            ->where('study_set_id', $activityId)
            ->select('id', 'term', 'definition', 'image_url')
            ->get()
            ->map(function ($card) {
                return [
                    'id' => (int) $card->id,
                    'term' => $card->term,
                    'definition' => $card->definition,
                    'imageUrl' => $card->image_url,
                ];
            });

        // Get quiz questions
        $quizQuestions = DB::table('quiz_questions')
            ->join('quizzes', 'quiz_questions.quiz_id', '=', 'quizzes.id')
            ->where('quizzes.study_set_id', $activityId)
            ->select(
                'quiz_questions.id',
                'quiz_questions.question_type',
                'quiz_questions.prompt',
                'quiz_questions.choices',
                'quiz_questions.correct_answer'
            )
            ->get()
            ->map(function ($question) {
                return [
                    'id' => (int) $question->id,
                    'type' => $question->question_type,
                    'question' => $question->prompt,
                    'options' => json_decode($question->choices, true) ?? [],
                    'correctAnswer' => $question->correct_answer,
                ];
            });

        // Check if student has completed this activity
        $quizAttempt = DB::table('quiz_attempts')
            ->join('quizzes', 'quiz_attempts.quiz_id', '=', 'quizzes.id')
            ->where('quizzes.study_set_id', $activityId)
            ->where('quiz_attempts.student_id', $studentId)
            ->select('quiz_attempts.score', 'quiz_attempts.answers', 'quiz_attempts.completed_at')
            ->orderByDesc('quiz_attempts.completed_at')
            ->first();

        $hasCompleted = $quizAttempt !== null;
        $previousAnswers = $hasCompleted ? json_decode($quizAttempt->answers, true) : null;
        $previousScore = $hasCompleted ? (int) $quizAttempt->score : null;

        return response()->json([
            'activity' => $activity,
            'flashcards' => $flashcards,
            'quizQuestions' => $quizQuestions,
            'hasCompleted' => $hasCompleted,
            'previousAnswers' => $previousAnswers,
            'previousScore' => $previousScore,
            'completedAt' => $quizAttempt ? $quizAttempt->completed_at : null,
        ]);
    }
}
