import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { csrfFetch } from '../lib/csrf';
import {
  AlignJustify,
  Bell,
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  Copy,
  FileText,
  FolderClosed,
  Globe,
  Home,
  ImagePlus,
  Keyboard,
  Layers3,
  Menu,
  Plus,
  Search,
  Shield,
  Sparkles,
  Trash2,
  WandSparkles,
  Users,
} from 'lucide-react';

type NavItem = {
  label: string;
  icon: React.ReactNode;
  path: string;
};

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

const primaryNav: NavItem[] = [
  { label: 'Home', icon: <Home size={18} />, path: '/teacher-dashboard' },
  { label: 'Your library', icon: <FolderClosed size={18} />, path: '/teacher-dashboard/library' },
  { label: 'Notifications', icon: <Bell size={18} />, path: '/teacher-dashboard/notifications' },
  { label: 'Classes', icon: <Users size={18} />, path: '/teacher-dashboard/classes' },
];

const teacherTools: NavItem[] = [
  { label: 'Assign activity', icon: <ClipboardCheck size={18} />, path: '/teacher-dashboard/assign-activity' },
  { label: 'Study Guides', icon: <FileText size={18} />, path: '/teacher-dashboard/study-guides' },
  { label: 'Practice Tests', icon: <ClipboardCheck size={18} />, path: '/teacher-dashboard/practice-tests' },
  { label: 'Reports', icon: <Sparkles size={18} />, path: '/teacher-dashboard/reports' },
];

const initialFlashcards: FlashcardDraft[] = [
  { id: 'fc-1', term: 'Mitochondria', definition: 'Cell organelle that produces ATP.', image: '' },
  { id: 'fc-2', term: 'Due Process', definition: 'Fair treatment through the normal judicial system.', image: '' },
];

const initialQuiz: QuizDraft[] = [
  {
    id: 'quiz-1',
    question: 'Which organelle produces ATP?',
    type: 'multiple_choice',
    options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi body'],
    answer: 'Mitochondria',
  },
  {
    id: 'quiz-2',
    question: 'Inflation always increases purchasing power.',
    type: 'true_false',
    options: ['True', 'False'],
    answer: 'False',
  },
];

function nextId(prefix: string, count: number) {
  return `${prefix}-${count + 1}`;
}

export default function TeacherCreateContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const [title, setTitle] = useState('Cell Structure Review');
  const [description, setDescription] = useState('High-impact revision set for class discussion and quiz prep.');
  const [subject, setSubject] = useState('Biology');
  const [className, setClassName] = useState('Grade 10 - A');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [shareMode, setShareMode] = useState<'class' | 'private' | 'public'>('class');
  const [flashcards, setFlashcards] = useState<FlashcardDraft[]>(initialFlashcards);
  const [quizQuestions, setQuizQuestions] = useState<QuizDraft[]>(initialQuiz);
  const [practiceMinutes, setPracticeMinutes] = useState(20);
  const [passingScore, setPassingScore] = useState(75);
  const [randomize, setRandomize] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['biology', 'review']);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');

  const navigateTo = (path: string) => {
    if (location.pathname === path) {
      return;
    }

    navigate(path);
  };

  const summary = useMemo(
    () => ({
      cards: flashcards.length,
      quizzes: quizQuestions.length,
      duration: `${practiceMinutes} min`,
      target: className,
    }),
    [className, flashcards.length, practiceMinutes, quizQuestions.length],
  );

  const addFlashcard = () => {
    setFlashcards((current) => [...current, { id: nextId('fc', current.length), term: '', definition: '', image: '' }]);
  };

  const updateFlashcard = (id: string, field: keyof FlashcardDraft, value: string) => {
    setFlashcards((current) => current.map((card) => (card.id === id ? { ...card, [field]: value } : card)));
  };

  const duplicateFlashcard = (id: string) => {
    setFlashcards((current) => {
      const index = current.findIndex((card) => card.id === id);
      if (index < 0) {
        return current;
      }

      const source = current[index];
      const copy = { ...source, id: nextId('fc', current.length), term: `${source.term} copy` };
      return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
  };

  const removeFlashcard = (id: string) => {
    setFlashcards((current) => current.filter((card) => card.id !== id));
  };

  const addQuizQuestion = () => {
    setQuizQuestions((current) => [
      ...current,
      {
        id: nextId('quiz', current.length),
        question: '',
        type: 'multiple_choice',
        options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
        answer: 'Option 1',
      },
    ]);
  };

  const updateQuizQuestion = (id: string, field: keyof QuizDraft, value: string | string[]) => {
    setQuizQuestions((current) =>
      current.map((question) => (question.id === id ? { ...question, [field]: value } : question)),
    );
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) {
      return;
    }

    setTags((current) => (current.includes(trimmed) ? current : [...current, trimmed]));
    setTagInput('');
  };

  const handlePublish = async () => {
    if (isPublishing) {
      return;
    }

    setIsPublishing(true);
    setPublishMessage('Publishing...');

    try {
      const response = await csrfFetch('/api/teacher/study-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          title,
          description,
          subject,
          className,
          visibility,
          shareMode,
          flashcards,
          quizQuestions,
          practiceMinutes,
          passingScore,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to publish content.');
      }

      setPublishMessage('Content published and assigned successfully.');
    } catch {
      setPublishMessage('Publish failed. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="td-page tcc-shell">
      <aside className="td-sidebar">
        <div className="td-brand-row">
          <button className="td-icon-btn" type="button" aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="td-logo" aria-label="Web Educ Tools">
            <span>Web Educ</span>
            <span>Tools</span>
          </div>
        </div>

        <nav className="td-nav">
          {primaryNav.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`td-nav-item ${location.pathname === item.path ? 'is-active' : ''}`}
              onClick={() => navigateTo(item.path)}
            >
              <span className="td-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="td-divider" />
        <div className="td-group-title">Teacher tools</div>
        <nav className="td-nav td-nav-tight">
          {teacherTools.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`td-nav-item ${location.pathname === item.path ? 'is-active' : ''}`}
              onClick={() => navigateTo(item.path)}
            >
              <span className="td-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="td-main tcc-main-shell">
        <div className="td-topbar tcc-topbar">
          <div className="td-search tcc-search">
            <Search size={20} />
            <input type="text" placeholder="Search content, questions, or classes" />
          </div>

          <div className="td-top-actions tcc-top-actions">
            <button className="td-inline-action" type="button" onClick={() => navigate('/teacher-dashboard')}>
              <Home size={14} /> Dashboard
            </button>
            <button className="td-avatar-btn" type="button" aria-label="Profile">
              <span className="td-avatar-initials">TC</span>
              <span className="td-avatar-dot" aria-hidden="true" />
            </button>
          </div>
        </div>

        <section className="tcc-builder tcc-builder-wide">
          <div className="tcc-builder-header">
            <div>
              <h1>Content Studio</h1>
              <p>Create study sets, quizzes, and practice tests in one place.</p>
            </div>
            <div className="tcc-builder-actions">
              <button className="td-inline-action" type="button">
                <Copy size={14} /> Duplicate
              </button>
              <button className="td-inline-action" type="button">
                <Trash2 size={14} /> Delete draft
              </button>
              <button className="td-inline-action" type="button" onClick={handlePublish} disabled={isPublishing}>
                <Plus size={14} /> {isPublishing ? 'Publishing...' : 'Publish'}
              </button>
            </div>
          </div>

          {publishMessage && <p className="ss-insight">{publishMessage}</p>}

          <div className="tcc-content-grid">
            <section className="tcc-editor-column">
              <article className="tcc-editor-card">
                <div className="td-panel-head">
                  <h2>Study Set Details</h2>
                  <Globe size={16} />
                </div>

                <div className="tcc-input-stack">
                  <input value={title} onChange={(event) => setTitle(event.target.value)} type="text" placeholder="Title" aria-label="Title" />
                  <input value={description} onChange={(event) => setDescription(event.target.value)} type="text" placeholder="Description" aria-label="Description" />
                </div>

                <div className="tcc-meta-grid">
                  <label>
                    Subject
                    <input value={subject} onChange={(event) => setSubject(event.target.value)} type="text" />
                  </label>
                  <label>
                    Class
                    <input value={className} onChange={(event) => setClassName(event.target.value)} type="text" />
                  </label>
                  <label>
                    Visibility
                    <select value={visibility} onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}>
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </label>
                  <label>
                    Share mode
                    <select value={shareMode} onChange={(event) => setShareMode(event.target.value as 'class' | 'private' | 'public')}>
                      <option value="class">Specific class</option>
                      <option value="private">Private</option>
                      <option value="public">Public</option>
                    </select>
                  </label>
                </div>

                <div className="tcc-chip-row">
                  <button className={`tcc-chip-toggle ${allowComments ? 'is-active' : ''}`} type="button" onClick={() => setAllowComments((current) => !current)}>
                    <Shield size={14} /> Comments {allowComments ? 'on' : 'off'}
                  </button>
                  <button className={`tcc-chip-toggle ${randomize ? 'is-active' : ''}`} type="button" onClick={() => setRandomize((current) => !current)}>
                    <WandSparkles size={14} /> Randomize {randomize ? 'on' : 'off'}
                  </button>
                </div>
              </article>

              <article className="tcc-editor-card">
                <div className="td-panel-head">
                  <h2>Flashcard Builder</h2>
                  <BookOpen size={16} />
                </div>

                <div className="tcc-card-list">
                  {flashcards.map((card, index) => (
                    <div key={card.id} className="tcc-card-row">
                      <div className="tcc-card-row-head">
                        <span>{index + 1}</span>
                        <div className="tcc-card-row-actions">
                          <button type="button" className="tcc-inline-icon" onClick={() => duplicateFlashcard(card.id)} aria-label="Duplicate card">
                            <Copy size={14} />
                          </button>
                          <button type="button" className="tcc-inline-icon" onClick={() => removeFlashcard(card.id)} aria-label="Remove card">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="tcc-card-fields">
                        <label>
                          Term
                          <input value={card.term} onChange={(event) => updateFlashcard(card.id, 'term', event.target.value)} type="text" placeholder="Enter term" />
                        </label>
                        <label>
                          Definition
                          <input value={card.definition} onChange={(event) => updateFlashcard(card.id, 'definition', event.target.value)} type="text" placeholder="Enter definition" />
                        </label>
                        <label>
                          Image
                          <div className="tcc-image-input">
                            <input value={card.image} onChange={(event) => updateFlashcard(card.id, 'image', event.target.value)} type="text" placeholder="Image URL or file name" />
                            <ImagePlus size={16} />
                          </div>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="td-inline-action" type="button" onClick={addFlashcard}>
                  <Plus size={14} /> Add flashcard
                </button>
              </article>

              <article className="tcc-editor-card">
                <div className="td-panel-head">
                  <h2>Quiz Builder</h2>
                  <Layers3 size={16} />
                </div>

                <div className="tcc-quiz-list">
                  {quizQuestions.map((question) => (
                    <div key={question.id} className="tcc-quiz-card">
                      <div className="tcc-card-row-head">
                        <strong>{question.type.replace('_', ' ')}</strong>
                        <button type="button" className="tcc-inline-icon" aria-label="Remove question" onClick={() => setQuizQuestions((current) => current.filter((item) => item.id !== question.id))}>
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <label>
                        Question
                        <input value={question.question} onChange={(event) => updateQuizQuestion(question.id, 'question', event.target.value)} type="text" placeholder="Write a question" />
                      </label>

                      <label>
                        Type
                        <select value={question.type} onChange={(event) => updateQuizQuestion(question.id, 'type', event.target.value)}>
                          <option value="multiple_choice">Multiple choice</option>
                          <option value="true_false">True / False</option>
                          <option value="identification">Identification</option>
                        </select>
                      </label>

                      <label>
                        Correct answer
                        <input value={question.answer} onChange={(event) => updateQuizQuestion(question.id, 'answer', event.target.value)} type="text" placeholder="Correct answer" />
                      </label>

                      {question.type !== 'identification' && (
                        <div className="tcc-option-grid">
                          {question.options.map((option, optionIndex) => (
                            <input
                              key={`${question.id}-${optionIndex}`}
                              value={option}
                              onChange={(event) => {
                                const nextOptions = [...question.options];
                                nextOptions[optionIndex] = event.target.value;
                                updateQuizQuestion(question.id, 'options', nextOptions);
                              }}
                              type="text"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button className="td-inline-action" type="button" onClick={addQuizQuestion}>
                  <Plus size={14} /> Add question
                </button>
              </article>

              <article className="tcc-editor-card">
                <div className="td-panel-head">
                  <h2>Practice Test Settings</h2>
                  <ClipboardCheck size={16} />
                </div>

                <div className="tcc-meta-grid">
                  <label>
                    Time limit (minutes)
                    <input value={practiceMinutes} onChange={(event) => setPracticeMinutes(Number(event.target.value) || 0)} type="number" min={1} />
                  </label>
                  <label>
                    Passing score
                    <input value={passingScore} onChange={(event) => setPassingScore(Number(event.target.value) || 0)} type="number" min={1} max={100} />
                  </label>
                </div>

                <div className="tcc-chip-row">
                  <button className={`tcc-chip-toggle ${randomize ? 'is-active' : ''}`} type="button" onClick={() => setRandomize((current) => !current)}>
                    Randomize questions
                  </button>
                  <button className={`tcc-chip-toggle ${allowComments ? 'is-active' : ''}`} type="button" onClick={() => setAllowComments((current) => !current)}>
                    Show explanations
                  </button>
                </div>
              </article>
            </section>

            <aside className="tcc-preview-column">
              <article className="tcc-preview-card">
                <div className="td-panel-head">
                  <h2>Content Summary</h2>
                  <ChevronDown size={16} />
                </div>
                <div className="tcc-summary-grid">
                  <div>
                    <span>Study sets</span>
                    <strong>{summary.cards}</strong>
                  </div>
                  <div>
                    <span>Questions</span>
                    <strong>{summary.quizzes}</strong>
                  </div>
                  <div>
                    <span>Duration</span>
                    <strong>{summary.duration}</strong>
                  </div>
                  <div>
                    <span>Target class</span>
                    <strong>{summary.target}</strong>
                  </div>
                </div>
              </article>

              <article className="tcc-preview-card">
                <div className="td-panel-head">
                  <h2>Sharing</h2>
                  <Globe size={16} />
                </div>
                <div className="tcc-share-stack">
                  <button className={`tcc-share-btn ${shareMode === 'class' ? 'is-active' : ''}`} type="button" onClick={() => setShareMode('class')}>
                    <Users size={14} /> Assign to class
                  </button>
                  <button className={`tcc-share-btn ${shareMode === 'private' ? 'is-active' : ''}`} type="button" onClick={() => setShareMode('private')}>
                    <Shield size={14} /> Private draft
                  </button>
                  <button className={`tcc-share-btn ${shareMode === 'public' ? 'is-active' : ''}`} type="button" onClick={() => setShareMode('public')}>
                    <Globe size={14} /> Public share
                  </button>
                </div>
              </article>

              <article className="tcc-preview-card">
                <div className="td-panel-head">
                  <h2>Tags & Notes</h2>
                  <Keyboard size={16} />
                </div>
                <div className="tcc-tag-input-row">
                  <input value={tagInput} onChange={(event) => setTagInput(event.target.value)} type="text" placeholder="Add a tag" />
                  <button className="td-inline-action" type="button" onClick={addTag}>
                    Add
                  </button>
                </div>
                <div className="tcc-tag-list">
                  {tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </article>

              <article className="tcc-preview-card">
                <div className="td-panel-head">
                  <h2>Preview Tools</h2>
                  <WandSparkles size={16} />
                </div>
                <div className="tcc-preview-actions">
                  <button className="td-inline-action" type="button">
                    <Search size={14} /> Preview
                  </button>
                  <button className="td-inline-action" type="button">
                    <Trash2 size={14} /> Clear draft
                  </button>
                </div>
              </article>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
