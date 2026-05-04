import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TeacherLayout from '../../components/ui/TeacherLayout';
import { csrfFetch } from '../../lib/csrf';
import {
  ArrowLeft,
  Plus,
  FileText,
  Upload,
  Sparkles,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

type QuestionType = 'multiple_choice' | 'true_false' | 'identification';

type MultipleChoiceQuestion = {
  id: string;
  type: 'multiple_choice';
  question: string;
  options: string[];
  correctAnswer: number;
  points: number;
};

type TrueFalseQuestion = {
  id: string;
  type: 'true_false';
  question: string;
  correctAnswer: boolean;
  points: number;
};

type IdentificationQuestion = {
  id: string;
  type: 'identification';
  question: string;
  correctAnswer: string;
  points: number;
};

type Question = MultipleChoiceQuestion | TrueFalseQuestion | IdentificationQuestion;

type GenerationSource = 'manual' | 'pdf' | 'powerpoint' | 'text';

export default function CreatePracticeTest() {
  const navigate = useNavigate();

  // Basic test info
  const [testTitle, setTestTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [className, setClassName] = useState('');
  const [duration, setDuration] = useState(60);
  const [instructions, setInstructions] = useState('');

  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionType, setCurrentQuestionType] = useState<QuestionType>('multiple_choice');

  // Generation mode
  const [generationMode, setGenerationMode] = useState<GenerationSource>('manual');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');

  // Manual question creation
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newCorrectAnswer, setNewCorrectAnswer] = useState(0);
  const [newTrueFalseAnswer, setNewTrueFalseAnswer] = useState(true);
  const [newIdentificationAnswer, setNewIdentificationAnswer] = useState('');
  const [newPoints, setNewPoints] = useState(1);

  // Submission
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ];
      if (validTypes.includes(file.type)) {
        setUploadedFile(file);
        setGenerationError('');
      } else {
        setGenerationError('Please upload a PDF or PowerPoint file.');
      }
    }
  };

  const handleGenerateQuestions = async () => {
    setIsGenerating(true);
    setGenerationError('');

    try {
      const formData = new FormData();
      formData.append('questionType', currentQuestionType);
      formData.append('source', generationMode);
      formData.append('questionCount', questionCount.toString());

      if (generationMode === 'pdf' || generationMode === 'powerpoint') {
        if (!uploadedFile) {
          setGenerationError('Please upload a file first.');
          setIsGenerating(false);
          return;
        }
        formData.append('file', uploadedFile);
      } else if (generationMode === 'text') {
        if (!pastedText.trim()) {
          setGenerationError('Please paste some text first.');
          setIsGenerating(false);
          return;
        }
        formData.append('text', pastedText);
      }

      const response = await csrfFetch('/api/teacher/practice-tests/generate-questions', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      const generatedQuestions = data.questions as Question[];

      setQuestions((prev) => [...prev, ...generatedQuestions]);
      setUploadedFile(null);
      setPastedText('');
      setGenerationError('');
    } catch (error) {
      setGenerationError('Failed to generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddManualQuestion = () => {
    const id = `q-${Date.now()}`;

    if (currentQuestionType === 'multiple_choice') {
      if (!newQuestion.trim() || newOptions.some((opt) => !opt.trim())) {
        return;
      }
      const question: MultipleChoiceQuestion = {
        id,
        type: 'multiple_choice',
        question: newQuestion,
        options: newOptions,
        correctAnswer: newCorrectAnswer,
        points: newPoints,
      };
      setQuestions((prev) => [...prev, question]);
    } else if (currentQuestionType === 'true_false') {
      if (!newQuestion.trim()) {
        return;
      }
      const question: TrueFalseQuestion = {
        id,
        type: 'true_false',
        question: newQuestion,
        correctAnswer: newTrueFalseAnswer,
        points: newPoints,
      };
      setQuestions((prev) => [...prev, question]);
    } else if (currentQuestionType === 'identification') {
      if (!newQuestion.trim() || !newIdentificationAnswer.trim()) {
        return;
      }
      const question: IdentificationQuestion = {
        id,
        type: 'identification',
        question: newQuestion,
        correctAnswer: newIdentificationAnswer,
        points: newPoints,
      };
      setQuestions((prev) => [...prev, question]);
    }

    // Reset form
    setNewQuestion('');
    setNewOptions(['', '', '', '']);
    setNewCorrectAnswer(0);
    setNewTrueFalseAnswer(true);
    setNewIdentificationAnswer('');
    setNewPoints(1);
    setShowQuestionForm(false);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleSavePracticeTest = async () => {
    if (!testTitle.trim() || !subject.trim() || questions.length === 0) {
      setSaveError('Please fill in all required fields and add at least one question.');
      return;
    }

    setIsSaving(true);
    setSaveError('');

    try {
      const response = await csrfFetch('/api/teacher/practice-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: testTitle,
          subject,
          className,
          duration,
          instructions,
          questions,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save test');
      }

      navigate('/teacher-dashboard/practice-tests');
    } catch (error) {
      setSaveError('Failed to save test. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <TeacherLayout>
      {() => (
        <div className="td-create-test-container">
          {/* Header */}
          <div className="td-create-test-header">
            <button className="td-back-btn" onClick={() => navigate('/teacher-dashboard/practice-tests')}>
              <ArrowLeft size={20} />
              Back to Tests
            </button>
            <div>
              <h1 className="td-page-title">Create Test</h1>
              <p className="td-page-subtitle">Build assessments with multiple question types and AI generation</p>
            </div>
          </div>

          <div className="td-create-test-layout">
            {/* Left Panel - Test Setup */}
            <div className="td-create-test-main">
              {/* Basic Information Card */}
              <div className="td-modern-card">
                <div className="td-card-header">
                  <h2 className="td-card-title">Test Information</h2>
                </div>
                <div className="td-card-body">
                  <div className="td-form-grid">
                    <label>
                      <span className="td-label-text">
                        Test Title <span className="td-required">*</span>
                      </span>
                      <input
                        type="text"
                        value={testTitle}
                        onChange={(e) => setTestTitle(e.target.value)}
                        placeholder="e.g., Midterm Test"
                        className="td-input"
                      />
                    </label>
                    <label>
                      <span className="td-label-text">
                        Subject <span className="td-required">*</span>
                      </span>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g., Mathematics"
                        className="td-input"
                      />
                    </label>
                    <label>
                      <span className="td-label-text">Class</span>
                      <input
                        type="text"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        placeholder="e.g., Grade 10-A"
                        className="td-input"
                      />
                    </label>
                    <label>
                      <span className="td-label-text">Duration (minutes)</span>
                      <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        min="1"
                        className="td-input"
                      />
                    </label>
                  </div>
                  <label>
                    <span className="td-label-text">Instructions (optional)</span>
                    <textarea
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="Enter test instructions for students..."
                      className="td-textarea"
                      rows={3}
                    />
                  </label>
                </div>
              </div>

              {/* Question Generation Card */}
              <div className="td-modern-card">
                <div className="td-card-header">
                  <div>
                    <h2 className="td-card-title">Add Questions</h2>
                    <p className="td-card-subtitle">Create manually or generate with AI</p>
                  </div>
                </div>
                <div className="td-card-body">
                  {/* Question Type Selection */}
                  <div className="td-question-type-selector">
                    <label className="td-label-text">Question Type</label>
                    <div className="td-type-buttons">
                      <button
                        className={`td-type-btn ${currentQuestionType === 'multiple_choice' ? 'active' : ''}`}
                        onClick={() => setCurrentQuestionType('multiple_choice')}
                      >
                        Multiple Choice
                      </button>
                      <button
                        className={`td-type-btn ${currentQuestionType === 'true_false' ? 'active' : ''}`}
                        onClick={() => setCurrentQuestionType('true_false')}
                      >
                        True or False
                      </button>
                      <button
                        className={`td-type-btn ${currentQuestionType === 'identification' ? 'active' : ''}`}
                        onClick={() => setCurrentQuestionType('identification')}
                      >
                        Identification
                      </button>
                    </div>
                  </div>

                  {/* Generation Mode Selection */}
                  <div className="td-generation-mode">
                    <label className="td-label-text">How would you like to add questions?</label>
                    <div className="td-mode-grid">
                      <button
                        className={`td-mode-card ${generationMode === 'manual' ? 'active' : ''}`}
                        onClick={() => setGenerationMode('manual')}
                      >
                        <FileText size={24} />
                        <span>Manual Entry</span>
                      </button>
                      <button
                        className={`td-mode-card ${generationMode === 'pdf' ? 'active' : ''}`}
                        onClick={() => setGenerationMode('pdf')}
                      >
                        <Upload size={24} />
                        <span>Upload PDF</span>
                      </button>
                      <button
                        className={`td-mode-card ${generationMode === 'powerpoint' ? 'active' : ''}`}
                        onClick={() => setGenerationMode('powerpoint')}
                      >
                        <Upload size={24} />
                        <span>Upload PowerPoint</span>
                      </button>
                      <button
                        className={`td-mode-card ${generationMode === 'text' ? 'active' : ''}`}
                        onClick={() => setGenerationMode('text')}
                      >
                        <Sparkles size={24} />
                        <span>Paste Text</span>
                      </button>
                    </div>
                  </div>

                  {/* Manual Question Form */}
                  {generationMode === 'manual' && (
                    <div className="td-manual-form">
                      {!showQuestionForm ? (
                        <button className="td-add-question-btn" onClick={() => setShowQuestionForm(true)}>
                          <Plus size={18} />
                          Add Question Manually
                        </button>
                      ) : (
                        <div className="td-question-form">
                          <label>
                            <span className="td-label-text">Question</span>
                            <textarea
                              value={newQuestion}
                              onChange={(e) => setNewQuestion(e.target.value)}
                              placeholder="Enter your question..."
                              className="td-textarea"
                              rows={3}
                            />
                          </label>

                          {currentQuestionType === 'multiple_choice' && (
                            <div className="td-options-section">
                              <span className="td-label-text">Options</span>
                              {newOptions.map((option, index) => (
                                <div key={index} className="td-option-input">
                                  <input
                                    type="radio"
                                    checked={newCorrectAnswer === index}
                                    onChange={() => setNewCorrectAnswer(index)}
                                  />
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => {
                                      const updated = [...newOptions];
                                      updated[index] = e.target.value;
                                      setNewOptions(updated);
                                    }}
                                    placeholder={`Option ${index + 1}`}
                                    className="td-input"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {currentQuestionType === 'true_false' && (
                            <div className="td-true-false-section">
                              <span className="td-label-text">Correct Answer</span>
                              <div className="td-radio-group">
                                <label className="td-radio-label">
                                  <input
                                    type="radio"
                                    checked={newTrueFalseAnswer === true}
                                    onChange={() => setNewTrueFalseAnswer(true)}
                                  />
                                  True
                                </label>
                                <label className="td-radio-label">
                                  <input
                                    type="radio"
                                    checked={newTrueFalseAnswer === false}
                                    onChange={() => setNewTrueFalseAnswer(false)}
                                  />
                                  False
                                </label>
                              </div>
                            </div>
                          )}

                          {currentQuestionType === 'identification' && (
                            <label>
                              <span className="td-label-text">Correct Answer</span>
                              <input
                                type="text"
                                value={newIdentificationAnswer}
                                onChange={(e) => setNewIdentificationAnswer(e.target.value)}
                                placeholder="Enter the correct answer..."
                                className="td-input"
                              />
                            </label>
                          )}

                          <label style={{ maxWidth: '150px' }}>
                            <span className="td-label-text">Points</span>
                            <input
                              type="number"
                              value={newPoints}
                              onChange={(e) => setNewPoints(Number(e.target.value))}
                              min="1"
                              className="td-input"
                            />
                          </label>

                          <div className="td-form-actions">
                            <button className="td-btn-primary" onClick={handleAddManualQuestion}>
                              <CheckCircle size={16} />
                              Add Question
                            </button>
                            <button className="td-btn-secondary" onClick={() => setShowQuestionForm(false)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* File Upload */}
                  {(generationMode === 'pdf' || generationMode === 'powerpoint') && (
                    <div className="td-upload-section">
                      <div className="td-upload-area">
                        <Upload size={32} />
                        <p>Upload {generationMode === 'pdf' ? 'PDF' : 'PowerPoint'} file</p>
                        <input
                          type="file"
                          accept={generationMode === 'pdf' ? '.pdf' : '.ppt,.pptx'}
                          onChange={handleFileUpload}
                          className="td-file-input"
                        />
                        {uploadedFile && (
                          <div className="td-uploaded-file">
                            <CheckCircle size={16} />
                            <span>{uploadedFile.name}</span>
                            <button onClick={() => setUploadedFile(null)}>
                              <X size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                      <label className="td-question-count-input">
                        <span className="td-label-text">Number of Questions to Generate</span>
                        <input
                          type="number"
                          value={questionCount}
                          onChange={(e) => setQuestionCount(Number(e.target.value))}
                          min="1"
                          max="50"
                          className="td-input"
                        />
                      </label>
                      <button
                        className="td-btn-generate"
                        onClick={handleGenerateQuestions}
                        disabled={!uploadedFile || isGenerating}
                      >
                        <Sparkles size={16} />
                        {isGenerating ? 'Generating...' : `Generate ${questionCount} Questions with AI`}
                      </button>
                    </div>
                  )}

                  {/* Text Paste */}
                  {generationMode === 'text' && (
                    <div className="td-text-section">
                      <label>
                        <span className="td-label-text">Paste your content</span>
                        <textarea
                          value={pastedText}
                          onChange={(e) => setPastedText(e.target.value)}
                          placeholder="Paste your lecture notes, study material, or any text content here..."
                          className="td-textarea"
                          rows={8}
                        />
                      </label>
                      <label className="td-question-count-input">
                        <span className="td-label-text">Number of Questions to Generate</span>
                        <input
                          type="number"
                          value={questionCount}
                          onChange={(e) => setQuestionCount(Number(e.target.value))}
                          min="1"
                          max="50"
                          className="td-input"
                        />
                      </label>
                      <button
                        className="td-btn-generate"
                        onClick={handleGenerateQuestions}
                        disabled={!pastedText.trim() || isGenerating}
                      >
                        <Sparkles size={16} />
                        {isGenerating ? 'Generating...' : `Generate ${questionCount} Questions with AI`}
                      </button>
                    </div>
                  )}

                  {generationError && (
                    <div className="td-error-message">
                      <AlertCircle size={16} />
                      {generationError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Questions Preview */}
            <div className="td-create-test-sidebar">
              <div className="td-modern-card td-sticky-card">
                <div className="td-card-header">
                  <div>
                    <h2 className="td-card-title">Questions ({questions.length})</h2>
                    <p className="td-card-subtitle">Total Points: {totalPoints}</p>
                  </div>
                </div>
                <div className="td-card-body">
                  {questions.length === 0 ? (
                    <div className="td-empty-state-small">
                      <FileText size={32} style={{ color: '#cbd5e1' }} />
                      <p>No questions added yet</p>
                    </div>
                  ) : (
                    <div className="td-questions-list">
                      {questions.map((q, index) => (
                        <div key={q.id} className="td-question-preview">
                          <div className="td-question-header">
                            <span className="td-question-number">Q{index + 1}</span>
                            <span className="td-question-badge">
                              {q.type === 'multiple_choice'
                                ? 'Multiple Choice'
                                : q.type === 'true_false'
                                ? 'True/False'
                                : 'Identification'}
                            </span>
                            <span className="td-question-points">{q.points} pts</span>
                            <button className="td-remove-question" onClick={() => handleRemoveQuestion(q.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <p className="td-question-text">{q.question}</p>
                          {q.type === 'multiple_choice' && (
                            <div className="td-question-options">
                              {q.options.map((opt, i) => (
                                <div
                                  key={i}
                                  className={`td-option ${i === q.correctAnswer ? 'correct' : ''}`}
                                >
                                  {i === q.correctAnswer && <CheckCircle size={12} />}
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
                          {q.type === 'true_false' && (
                            <div className="td-answer-preview">
                              <CheckCircle size={12} />
                              Answer: {q.correctAnswer ? 'True' : 'False'}
                            </div>
                          )}
                          {q.type === 'identification' && (
                            <div className="td-answer-preview">
                              <CheckCircle size={12} />
                              Answer: {q.correctAnswer}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="td-card-footer">
                  {saveError && (
                    <div className="td-error-message" style={{ marginBottom: '1rem' }}>
                      <AlertCircle size={16} />
                      {saveError}
                    </div>
                  )}
                  <button
                    className="td-btn-save-test"
                    onClick={handleSavePracticeTest}
                    disabled={isSaving || questions.length === 0}
                  >
                    {isSaving ? 'Saving...' : 'Save Test'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}
