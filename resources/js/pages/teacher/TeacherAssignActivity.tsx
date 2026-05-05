import React, { useEffect, useState } from 'react';
import TeacherLayout from '../../components/ui/TeacherLayout';
import { csrfFetch } from '../../lib/csrf';
import { BookOpen, Copy, Layers3, Plus, Sparkles, Trash2, X } from 'lucide-react';

type FlashcardDraft = {
  id: string;
  term: string;
  definition: string;
  image: string;
};

type QuizDraft = {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'identification';
  options: string[];
  answer: string;
};

type ClassItem = {
  id: number;
  name: string;
  subject: string;
  description: string;
  studentsCount: number;
  updatedAt: string;
};

const initialFlashcards: FlashcardDraft[] = [];
const initialQuiz: QuizDraft[] = [];

function nextId(prefix: string, count: number) {
  return `${prefix}-${count + 1}`;
}

export default function TeacherAssignActivity() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [classField, setClassField] = useState('');
  const [schedule, setSchedule] = useState('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [flashcards, setFlashcards] = useState<FlashcardDraft[]>(initialFlashcards);
  const [quizQuestions, setQuizQuestions] = useState<QuizDraft[]>(initialQuiz);
  const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [editingFlashcard, setEditingFlashcard] = useState<FlashcardDraft | null>(null);
  const [editingQuiz, setEditingQuiz] = useState<QuizDraft | null>(null);
  const [draftFlashcard, setDraftFlashcard] = useState<FlashcardDraft>({ id: '', term: '', definition: '', image: '' });
  const [draftQuiz, setDraftQuiz] = useState<QuizDraft>({
    id: '',
    question: '',
    type: 'multiple_choice',
    options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
    answer: '',
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  
  // AI Generate states
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateType, setGenerateType] = useState<'flashcards' | 'quiz'>('flashcards');
  const [generateSource, setGenerateSource] = useState<'text' | 'pdf' | 'powerpoint'>('text');
  const [generateText, setGenerateText] = useState('');
  const [generateFile, setGenerateFile] = useState<File | null>(null);
  const [generateCount, setGenerateCount] = useState(5);
  const [generateQuestionType, setGenerateQuestionType] = useState<'multiple_choice' | 'true_false' | 'identification' | 'mixed'>('multiple_choice');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const response = await csrfFetch('/api/classes');
        if (response.ok) {
          const data = await response.json();
          setClasses(data.classes || []);
        }
      } catch (error) {
        console.error('Failed to fetch classes:', error);
      } finally {
        setIsLoadingClasses(false);
      }
    };
    fetchClasses();
  }, []);

  const openFlashcardModal = (card?: FlashcardDraft) => {
    if (card) {
      setEditingFlashcard(card);
      setDraftFlashcard(card);
    } else {
      setEditingFlashcard(null);
      setDraftFlashcard({ id: nextId('fc', flashcards.length), term: '', definition: '', image: '' });
    }
    setIsFlashcardModalOpen(true);
  };

  const saveFlashcard = () => {
    if (editingFlashcard) {
      setFlashcards((current) => current.map((card) => (card.id === editingFlashcard.id ? draftFlashcard : card)));
    } else {
      setFlashcards((current) => [...current, draftFlashcard]);
    }
    setIsFlashcardModalOpen(false);
    setEditingFlashcard(null);
  };

  const duplicateFlashcard = (id: string) => {
    setFlashcards((current) => {
      const index = current.findIndex((card) => card.id === id);
      if (index < 0) return current;
      const source = current[index];
      const copy = { ...source, id: nextId('fc', current.length), term: `${source.term} copy` };
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
  };

  const removeFlashcard = (id: string) => {
    setFlashcards((current) => current.filter((card) => card.id !== id));
  };

  const openQuizModal = (quiz?: QuizDraft) => {
    if (quiz) {
      setEditingQuiz(quiz);
      setDraftQuiz(quiz);
    } else {
      setEditingQuiz(null);
      setDraftQuiz({
        id: nextId('quiz', quizQuestions.length),
        question: '',
        type: 'multiple_choice',
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        answer: '',
      });
    }
    setIsQuizModalOpen(true);
  };

  const saveQuiz = () => {
    if (editingQuiz) {
      setQuizQuestions((current) => current.map((q) => (q.id === editingQuiz.id ? draftQuiz : q)));
    } else {
      setQuizQuestions((current) => [...current, draftQuiz]);
    }
    setIsQuizModalOpen(false);
    setEditingQuiz(null);
  };

  const removeQuiz = (id: string) => {
    setQuizQuestions((current) => current.filter((q) => q.id !== id));
  };

  const openGenerateModal = (type: 'flashcards' | 'quiz') => {
    setGenerateType(type);
    setGenerateSource('text');
    setGenerateText('');
    setGenerateFile(null);
    setGenerateCount(5);
    setGenerateQuestionType('multiple_choice');
    setGenerateError('');
    setIsGenerateModalOpen(true);
  };

  const handleGenerate = async () => {
    if (isGenerating) return;
    
    if (generateSource === 'text' && !generateText.trim()) {
      setGenerateError('Please enter some text to generate from');
      return;
    }
    
    if ((generateSource === 'pdf' || generateSource === 'powerpoint') && !generateFile) {
      setGenerateError('Please upload a file');
      return;
    }

    setIsGenerating(true);
    setGenerateError('');

    try {
      const formData = new FormData();
      formData.append('contentType', generateType);
      formData.append('source', generateSource);
      formData.append('itemCount', generateCount.toString());
      
      if (generateType === 'quiz') {
        formData.append('questionType', generateQuestionType);
      }
      
      if (generateSource === 'text') {
        formData.append('text', generateText);
      } else if (generateFile) {
        formData.append('file', generateFile);
      }

      const response = await csrfFetch('/api/teacher/generate-content', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();
      
      if (data.success && data.items) {
        if (generateType === 'flashcards') {
          const newFlashcards = data.items.map((item: any) => ({
            id: item.id || nextId('fc', flashcards.length),
            term: item.term,
            definition: item.definition,
            image: item.image || '',
          }));
          setFlashcards((current) => [...current, ...newFlashcards]);
        } else {
          const newQuestions = data.items.map((item: any) => ({
            id: item.id || nextId('quiz', quizQuestions.length),
            question: item.question,
            type: item.type,
            options: item.options || [],
            answer: item.answer,
          }));
          setQuizQuestions((current) => [...current, ...newQuestions]);
        }
        setIsGenerateModalOpen(false);
      } else {
        setGenerateError('Failed to generate content');
      }
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : 'Failed to generate content');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (isPublishing) return;

    setIsPublishing(true);
    setPublishMessage('Publishing...');

    const normalizedFlashcards = flashcards
      .map((card) => ({
        term: card.term.trim(),
        definition: card.definition.trim(),
        image: card.image.trim(),
      }))
      .filter((card) => card.term.length > 0 && card.definition.length > 0);

    const normalizedQuizQuestions = quizQuestions
      .map((question) => ({
        question: question.question.trim(),
        type: question.type,
        options: question.options.map((option) => option.trim()).filter(Boolean),
        answer: question.answer.trim(),
      }))
      .filter((question) => question.question.length > 0 && question.answer.length > 0);

    try {
      const response = await csrfFetch('/api/teacher/study-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          title,
          description,
          subject,
          class_id: classField ? parseInt(classField) : null,
          schedule,
          flashcards: normalizedFlashcards,
          quizQuestions: normalizedQuizQuestions,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to publish content.';
        try {
          const payload = await response.json();
          if (payload?.message) errorMessage = payload.message;
        } catch {
          // Keep generic error
        }
        throw new Error(errorMessage);
      }

      setPublishMessage('Content published successfully.');
      // Clear form after successful publish
      setTimeout(() => {
        setTitle('');
        setDescription('');
        setSubject('');
        setClassField('');
        setSchedule('');
        setFlashcards([]);
        setQuizQuestions([]);
        setPublishMessage('');
      }, 2000);
    } catch (error) {
      setPublishMessage(error instanceof Error ? error.message : 'Publish failed. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <TeacherLayout>
      {() => (
        <div className="td-dashboard-grid">
          <section className="td-panel td-panel-span-2">
            <div className="td-panel-head">
              <h2>Create Activity</h2>
              <button className="td-inline-action" type="button" onClick={handlePublish} disabled={isPublishing}>
                <Plus size={14} /> {isPublishing ? 'Publishing...' : 'Publish Activity'}
              </button>
            </div>

            {publishMessage && (
              <div style={{ padding: '12px', marginBottom: '16px', backgroundColor: publishMessage.includes('success') ? '#d4edda' : '#f8d7da', color: publishMessage.includes('success') ? '#155724' : '#721c24', borderRadius: '4px' }}>
                {publishMessage}
              </div>
            )}

            <div className="tcc-input-stack" style={{ marginBottom: '24px' }}>
              <input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                type="text" 
                placeholder="Activity Title" 
                style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '16px' }}
              />
              <input 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                type="text" 
                placeholder="Description" 
                style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              />
              <input 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                type="text" 
                placeholder="Subject" 
                style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              />
              <select 
                value={classField} 
                onChange={(e) => setClassField(e.target.value)}
                disabled={isLoadingClasses}
                style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', backgroundColor: '#fff', cursor: isLoadingClasses ? 'wait' : 'pointer' }}
              >
                <option value="">{isLoadingClasses ? 'Loading classes...' : 'Select a class'}</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} - {cls.subject}
                  </option>
                ))}
              </select>
              <input 
                value={schedule} 
                onChange={(e) => setSchedule(e.target.value)} 
                type="datetime-local" 
                placeholder="Schedule" 
                style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              />
            </div>
          </section>

          <section className="td-panel td-panel-span-2">
            <div className="td-panel-head">
              <h2>Flashcards</h2>
              <BookOpen size={16} />
            </div>

            <div className="td-stack-list">
              {flashcards.length === 0 ? (
                <p className="td-empty-state">No flashcards yet. Click below to add one.</p>
              ) : (
                flashcards.map((card, index) => (
                  <article key={card.id} className="td-stack-item" style={{ cursor: 'pointer' }} onClick={() => openFlashcardModal(card)}>
                    <div>
                      <h3>{card.term || 'No term'}</h3>
                      <p>{card.definition || 'No definition'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="button" 
                        className="tcc-inline-icon" 
                        onClick={(e) => { e.stopPropagation(); duplicateFlashcard(card.id); }} 
                        aria-label="Duplicate"
                        style={{ padding: '4px' }}
                      >
                        <Copy size={14} />
                      </button>
                      <button 
                        type="button" 
                        className="tcc-inline-icon" 
                        onClick={(e) => { e.stopPropagation(); removeFlashcard(card.id); }} 
                        aria-label="Delete"
                        style={{ padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="td-inline-action" type="button" onClick={() => openFlashcardModal()}>
                <Plus size={14} /> Add flashcard
              </button>
              <button 
                className="td-inline-action" 
                type="button" 
                onClick={() => openGenerateModal('flashcards')}
                style={{ backgroundColor: '#6366f1', border: 'none' }}
              >
                <Sparkles size={14} /> Generate with AI
              </button>
            </div>
          </section>

          <section className="td-panel td-panel-span-2">
            <div className="td-panel-head">
              <h2>Quiz Questions</h2>
              <Layers3 size={16} />
            </div>

            <div className="td-stack-list">
              {quizQuestions.length === 0 ? (
                <p className="td-empty-state">No quiz questions yet. Click below to add one.</p>
              ) : (
                quizQuestions.map((question, index) => (
                  <article key={question.id} className="td-stack-item" style={{ cursor: 'pointer' }} onClick={() => openQuizModal(question)}>
                    <div>
                      <h3>
                        {index + 1}. {question.type === 'multiple_choice' ? 'Multiple Choice' : question.type === 'true_false' ? 'True/False' : 'Identification'}
                      </h3>
                      <p><strong>{question.question || 'No question'}</strong></p>
                      <p><small>Answer: {question.answer || 'No answer'}</small></p>
                    </div>
                    <button 
                      type="button" 
                      className="tcc-inline-icon" 
                      onClick={(e) => { e.stopPropagation(); removeQuiz(question.id); }} 
                      aria-label="Delete"
                      style={{ padding: '4px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </article>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="td-inline-action" type="button" onClick={() => openQuizModal()}>
                <Plus size={14} /> Add quiz question
              </button>
              <button 
                className="td-inline-action" 
                type="button" 
                onClick={() => openGenerateModal('quiz')}
                style={{ backgroundColor: '#6366f1', border: 'none' }}
              >
                <Sparkles size={14} /> Generate with AI
              </button>
            </div>
          </section>

          {isFlashcardModalOpen && (
            <div 
              className="td-badge-overlay" 
              role="presentation" 
              onClick={() => setIsFlashcardModalOpen(false)}
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
            >
              <div 
                className="td-badge-frame" 
                role="dialog" 
                aria-modal="true" 
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  maxWidth: '600px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)'
                }}
              >
                <section className="td-badge-modal" style={{ padding: '32px' }}>
                  <div className="td-badge-modal-head" style={{ marginBottom: '24px', borderBottom: 'none', paddingBottom: '0' }}>
                    <div>
                      <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                        {editingFlashcard ? 'Edit Flashcard' : 'New Flashcard'}
                      </h2>
                      <p style={{ fontSize: '14px', color: '#64748b' }}>Create a flashcard with term and definition.</p>
                    </div>
                    <button 
                      className="tcc-inline-icon" 
                      type="button" 
                      aria-label="Close" 
                      onClick={() => setIsFlashcardModalOpen(false)}
                      style={{ 
                        position: 'absolute', 
                        top: '24px', 
                        right: '24px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e0e7ff';
                        e.currentTarget.style.color = '#4f46e5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#64748b';
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Term</span>
                      <input 
                        value={draftFlashcard.term} 
                        onChange={(e) => setDraftFlashcard({ ...draftFlashcard, term: e.target.value })} 
                        type="text" 
                        placeholder="Enter term"
                        style={{
                          padding: '12px 16px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          color: '#1e293b',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#6366f1';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Definition</span>
                      <textarea 
                        value={draftFlashcard.definition} 
                        onChange={(e) => setDraftFlashcard({ ...draftFlashcard, definition: e.target.value })} 
                        placeholder="Enter definition" 
                        rows={4}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          color: '#1e293b',
                          fontSize: '14px',
                          outline: 'none',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#6366f1';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Image URL (optional)</span>
                      <input 
                        value={draftFlashcard.image} 
                        onChange={(e) => setDraftFlashcard({ ...draftFlashcard, image: e.target.value })} 
                        type="text" 
                        placeholder="https://example.com/image.jpg"
                        style={{
                          padding: '12px 16px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          color: '#1e293b',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#6366f1';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '32px', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      onClick={() => setIsFlashcardModalOpen(false)}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: 'transparent',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        color: '#64748b',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                        e.currentTarget.style.color = '#1e293b';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#64748b';
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      onClick={saveFlashcard}
                      style={{
                        padding: '10px 24px',
                        backgroundColor: '#6366f1',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#4f46e5';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#6366f1';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
                      }}
                    >
                      Save Flashcard
                    </button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {isQuizModalOpen && (
            <div 
              className="td-badge-overlay" 
              role="presentation" 
              onClick={() => setIsQuizModalOpen(false)}
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
            >
              <div 
                className="td-badge-frame" 
                role="dialog" 
                aria-modal="true" 
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  maxWidth: '700px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)'
                }}
              >
                <section className="td-badge-modal" style={{ padding: '32px' }}>
                  <div className="td-badge-modal-head" style={{ marginBottom: '24px', borderBottom: 'none', paddingBottom: '0' }}>
                    <div>
                      <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                        {editingQuiz ? 'Edit Quiz Question' : 'New Quiz Question'}
                      </h2>
                      <p style={{ fontSize: '14px', color: '#64748b' }}>Create a quiz question with answer choices.</p>
                    </div>
                    <button 
                      className="tcc-inline-icon" 
                      type="button" 
                      aria-label="Close" 
                      onClick={() => setIsQuizModalOpen(false)}
                      style={{ 
                        position: 'absolute', 
                        top: '24px', 
                        right: '24px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e0e7ff';
                        e.currentTarget.style.color = '#4f46e5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#64748b';
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Question</span>
                      <textarea 
                        value={draftQuiz.question} 
                        onChange={(e) => setDraftQuiz({ ...draftQuiz, question: e.target.value })} 
                        placeholder="Write your question here" 
                        rows={3}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          color: '#1e293b',
                          fontSize: '14px',
                          outline: 'none',
                          resize: 'vertical',
                          fontFamily: 'inherit',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#6366f1';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Question Type</span>
                      <select
                        value={draftQuiz.type}
                        onChange={(e) => {
                          const newType = e.target.value as QuizDraft['type'];
                          if (newType === 'true_false') {
                            setDraftQuiz({ ...draftQuiz, type: newType, options: ['True', 'False'], answer: '' });
                          } else if (newType === 'identification') {
                            setDraftQuiz({ ...draftQuiz, type: newType, options: [], answer: '' });
                          } else {
                            setDraftQuiz({ ...draftQuiz, type: newType, options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'], answer: '' });
                          }
                        }}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          color: '#1e293b',
                          fontSize: '14px',
                          outline: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#6366f1';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="true_false">True or False</option>
                        <option value="identification">Identification</option>
                      </select>
                    </label>

                    {draftQuiz.type === 'multiple_choice' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Options</span>
                        {draftQuiz.options.map((option, idx) => (
                          <input
                            key={idx}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...draftQuiz.options];
                              newOptions[idx] = e.target.value;
                              setDraftQuiz({ ...draftQuiz, options: newOptions });
                            }}
                            type="text"
                            placeholder={`Option ${idx + 1}`}
                            style={{
                              padding: '12px 16px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              color: '#1e293b',
                              fontSize: '14px',
                              outline: 'none',
                              transition: 'all 0.2s'
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = '#6366f1';
                              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = '#e2e8f0';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {draftQuiz.type === 'true_false' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Options</span>
                        {draftQuiz.options.map((option, idx) => (
                          <input
                            key={idx}
                            value={option}
                            type="text"
                            readOnly
                            disabled
                            style={{
                              padding: '12px 16px',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              color: '#94a3b8',
                              fontSize: '14px',
                              cursor: 'not-allowed'
                            }}
                          />
                        ))}
                      </div>
                    )}

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Correct Answer</span>
                      <input 
                        value={draftQuiz.answer} 
                        onChange={(e) => setDraftQuiz({ ...draftQuiz, answer: e.target.value })} 
                        type="text" 
                        placeholder={draftQuiz.type === 'true_false' ? 'Enter "True" or "False"' : 'Enter the correct answer'}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          color: '#1e293b',
                          fontSize: '14px',
                          outline: 'none',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#6366f1';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '32px', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      onClick={() => setIsQuizModalOpen(false)}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: 'transparent',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        color: '#64748b',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                        e.currentTarget.style.color = '#1e293b';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#64748b';
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      onClick={saveQuiz}
                      style={{
                        padding: '10px 24px',
                        backgroundColor: '#6366f1',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#4f46e5';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#6366f1';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
                      }}
                    >
                      Save Question
                    </button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {isGenerateModalOpen && (
            <div 
              className="td-badge-overlay" 
              role="presentation" 
              onClick={() => setIsGenerateModalOpen(false)}
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)' }}
            >
              <div 
                className="td-badge-frame" 
                role="dialog" 
                aria-modal="true" 
                onClick={(e) => e.stopPropagation()}
                style={{ 
                  maxWidth: '650px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)'
                }}
              >
                <section className="td-badge-modal" style={{ padding: '32px' }}>
                  <div className="td-badge-modal-head" style={{ marginBottom: '24px', borderBottom: 'none', paddingBottom: '0' }}>
                    <div>
                      <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={24} style={{ color: '#6366f1' }} />
                        Generate {generateType === 'flashcards' ? 'Flashcards' : 'Quiz Questions'} with AI
                      </h2>
                      <p style={{ fontSize: '14px', color: '#64748b' }}>
                        Use AI to generate content from your text or uploaded files.
                      </p>
                    </div>
                    <button 
                      className="tcc-inline-icon" 
                      type="button" 
                      aria-label="Close" 
                      onClick={() => setIsGenerateModalOpen(false)}
                      style={{ 
                        position: 'absolute', 
                        top: '24px', 
                        right: '24px',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e0e7ff';
                        e.currentTarget.style.color = '#4f46e5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#64748b';
                      }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {generateError && (
                    <div style={{ 
                      padding: '12px', 
                      marginBottom: '20px', 
                      backgroundColor: '#fee2e2', 
                      color: '#991b1b', 
                      borderRadius: '8px',
                      fontSize: '14px',
                      border: '1px solid #fecaca'
                    }}>
                      {generateError}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Content Source</span>
                      <select
                        value={generateSource}
                        onChange={(e) => setGenerateSource(e.target.value as any)}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          color: '#1e293b',
                          fontSize: '14px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="text">Text Input</option>
                        <option value="pdf">PDF Upload</option>
                        <option value="powerpoint">PowerPoint Upload</option>
                      </select>
                    </label>

                    {generateSource === 'text' && (
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Your Content</span>
                        <textarea 
                          value={generateText}
                          onChange={(e) => setGenerateText(e.target.value)}
                          placeholder="Paste your study material here..."
                          rows={6}
                          style={{
                            padding: '12px 16px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            color: '#1e293b',
                            fontSize: '14px',
                            outline: 'none',
                            resize: 'vertical',
                            fontFamily: 'inherit'
                          }}
                        />
                      </label>
                    )}

                    {(generateSource === 'pdf' || generateSource === 'powerpoint') && (
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                          Upload {generateSource === 'pdf' ? 'PDF' : 'PowerPoint'} File
                        </span>
                        <input
                          type="file"
                          accept={generateSource === 'pdf' ? '.pdf' : '.ppt,.pptx'}
                          onChange={(e) => setGenerateFile(e.target.files?.[0] || null)}
                          style={{
                            padding: '12px 16px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            color: '#1e293b',
                            fontSize: '14px',
                            cursor: 'pointer'
                          }}
                        />
                        {generateFile && (
                          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            Selected: {generateFile.name}
                          </p>
                        )}
                      </label>
                    )}

                    {generateType === 'quiz' && (
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>Question Type</span>
                        <select
                          value={generateQuestionType}
                          onChange={(e) => setGenerateQuestionType(e.target.value as any)}
                          style={{
                            padding: '12px 16px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            color: '#1e293b',
                            fontSize: '14px',
                            outline: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="true_false">True or False</option>
                          <option value="identification">Identification</option>
                          <option value="mixed">Mixed Types</option>
                        </select>
                      </label>
                    )}

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                        Number of Items (1-50)
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={generateCount}
                        onChange={(e) => setGenerateCount(Math.min(50, Math.max(1, parseInt(e.target.value) || 5)))}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          color: '#1e293b',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                    </label>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '32px', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      onClick={() => setIsGenerateModalOpen(false)}
                      disabled={isGenerating}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: 'transparent',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        color: '#64748b',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: isGenerating ? 'not-allowed' : 'pointer',
                        opacity: isGenerating ? 0.5 : 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      style={{
                        padding: '10px 24px',
                        backgroundColor: '#6366f1',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: isGenerating ? 'not-allowed' : 'pointer',
                        opacity: isGenerating ? 0.7 : 1,
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {isGenerating ? (
                        <>Generating...</>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Generate
                        </>
                      )}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      )}
    </TeacherLayout>
  );
}
