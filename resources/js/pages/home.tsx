import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenu, setOpenMenu] = useState<'tools' | 'subjects' | null>(null);
  const [activeSubject, setActiveSubject] = useState('GCSE');
  const navRef = useRef<HTMLElement | null>(null);

  const studyTools = {
    students: ['Flashcards', 'Learn', 'Study Guides', 'Test', 'Expert solutions', 'Study groups', 'Learning games'],
    teachers: ['Live', 'Blast'],
  };

  const subjectAreas = [
    { name: 'GCSE', topics: ['Maths', 'Biology', 'Chemistry', 'Physics', 'French', 'View all'] },
    { name: 'A Levels', topics: ['Maths', 'Further Maths', 'Biology', 'Chemistry', 'Economics', 'View all'] },
    { name: 'Arts and Humanities', topics: ['History', 'Art', 'Geography', 'Philosophy', 'Literature', 'View all'] },
    { name: 'Languages', topics: ['French', 'Spanish', 'German', 'English', 'Mandarin', 'View all'] },
    { name: 'Maths', topics: ['Algebra', 'Geometry', 'Trigonometry', 'Calculus', 'Statistics', 'View all'] },
    { name: 'Science', topics: ['Biology', 'Chemistry', 'Physics', 'Computer Science', 'Earth Science', 'View all'] },
    { name: 'Social Sciences', topics: ['Psychology', 'Sociology', 'Economics', 'Politics', 'Law', 'View all'] },
    { name: 'Other', topics: ['Business', 'Design', 'Media', 'Health', 'General Studies', 'View all'] },
  ];

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const selectedSubject = subjectAreas.find((item) => item.name === activeSubject) ?? subjectAreas[0];

  const toggleMenu = (menu: 'tools' | 'subjects') => {
    setOpenMenu((current) => (current === menu ? null : menu));
  };

  const studyModes = [
    {
      id: 1,
      title: 'Learn',
      cssClass: 'bg-cyan',
      icon: '🧠',
      content: {
        label: 'la pintura',
        image: '🎨',
        picture: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=640&q=80',
      },
    },
    {
      id: 2,
      title: 'Study Guides',
      cssClass: 'bg-pink',
      icon: '📖',
      content: {
        label: 'Greek art',
        keyDates: ['Dark Age of Greece', 'Geometric Period'],
        picture: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=640&q=80',
      },
    },
    {
      id: 3,
      title: 'Flashcards',
      cssClass: 'bg-blue',
      icon: '📇',
      content: {
        term: 'superior vena cava',
        definition: 'Major vein in upper body',
        picture: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=640&q=80',
      },
    },
    {
      id: 4,
      title: 'Practice Tests',
      cssClass: 'bg-orange',
      icon: '✍️',
      content: {
        score: '84%',
        answers: '76/90',
        time: '70m',
        picture: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=640&q=80',
      },
    },
  ];

  return (
    <div>
      <header>
        <div className="header-container">
          <div className="logo">
            <div className="logo-icon">W</div>
            <span>WebEduc</span>
          </div>

          <nav className="home-nav" ref={navRef}>
            <div className="nav-menu-wrap">
              <button
                type="button"
                className={`nav-trigger ${openMenu === 'tools' ? 'is-open' : ''}`}
                onClick={() => toggleMenu('tools')}
                aria-expanded={openMenu === 'tools'}
                aria-haspopup="menu"
              >
                Study tools
                <ChevronDown size={16} />
              </button>

              {openMenu === 'tools' && (
                <div className="nav-menu nav-menu-tools" role="menu">
                  <div className="nav-menu-column">
                    <p className="nav-menu-heading">Students</p>
                    {studyTools.students.map((item) => (
                      <button key={item} type="button" className="nav-menu-item">
                        <span className="nav-menu-icon" aria-hidden="true">◆</span>
                        {item}
                      </button>
                    ))}
                  </div>

                  <div className="nav-menu-divider" />

                  <div className="nav-menu-column">
                    <p className="nav-menu-heading">Teachers</p>
                    {studyTools.teachers.map((item) => (
                      <button key={item} type="button" className="nav-menu-item">
                        <span className="nav-menu-icon" aria-hidden="true">◆</span>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="nav-menu-wrap">
              <button
                type="button"
                className={`nav-trigger ${openMenu === 'subjects' ? 'is-open' : ''}`}
                onClick={() => toggleMenu('subjects')}
                aria-expanded={openMenu === 'subjects'}
                aria-haspopup="menu"
              >
                Subject areas
                <ChevronDown size={16} />
              </button>

              {openMenu === 'subjects' && (
                <div className="nav-menu nav-menu-subjects" role="menu">
                  <div className="subject-list">
                    {subjectAreas.map((subject) => (
                      <button
                        key={subject.name}
                        type="button"
                        className={`subject-item ${subject.name === selectedSubject.name ? 'is-active' : ''}`}
                        onMouseEnter={() => setActiveSubject(subject.name)}
                        onFocus={() => setActiveSubject(subject.name)}
                      >
                        <span>{subject.name}</span>
                        <ChevronRight size={16} />
                      </button>
                    ))}
                  </div>

                  <div className="subject-detail">
                    {selectedSubject.topics.map((topic) => (
                      <button key={topic} type="button" className="subject-topic">
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          <div className="search-container">
            <Search size={18} color="#9ca3af" />
            <input
              type="text"
              placeholder="Search for practice tests"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="header-actions">
            <Link
              to="/signup"
              style={{
                background: 'none',
                border: 'none',
                color: '#7678ed',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
              className="no-underline"
            >
              <Plus size={16} /> Create
            </Link>
            <Link to="/login" className="btn btn-primary">Log in</Link>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="max-width-container">
          <h1>How do you want to study?</h1>
          <p>
              Master whatever you're learning with WebEduc's interactive flashcards, practice tests and study activities.
          </p>
          <Link to="/signup" className="btn btn-primary btn-lg">Sign up for free</Link>
          <p>
            <Link to="/signup?role=teacher" className="teacher-link">I'm a teacher</Link>
          </p>
        </div>
      </section>

      <section className="carousel-section">
        <div className="max-width-container">
          <p className="carousel-kicker">Choose your study style</p>
          <div className="carousel-container">
            <div className="carousel-wrapper">
              <div className="carousel-inner">
                {studyModes.map((mode) => (
                  <article key={mode.id} className={`carousel-card ${mode.cssClass}`}>
                    <div className="card-shine" aria-hidden="true" />
                    {mode.id === 1 && (
                      <div className="card-layout">
                        <h3 className="card-title">{mode.title}</h3>
                        <div className="card-image-wrap">
                          <img src={mode.content.picture as string} alt="Painting artwork" className="card-image" />
                        </div>
                        <div className="card-content">
                          <span className="card-emoji">{mode.content.image as string}</span>
                          <p className="card-label">{mode.content.label as string}</p>
                          <input
                            type="text"
                            placeholder="Type the answer"
                            className="card-input"
                          />
                        </div>
                      </div>
                    )}

                    {mode.id === 2 && (
                      <div className="card-layout">
                        <h3 className="card-title">{mode.title}</h3>
                        <div className="card-box">
                          <img src={mode.content.picture as string} alt="Greek sculpture" className="card-thumb" />
                          <h4>{mode.content.label as string}</h4>
                          <div style={{ display: 'grid', gap: '0.5rem' }}>
                            <div>
                              <p className="card-small-label">Outline</p>
                              <p className="card-small-text">Quick reference</p>
                            </div>
                            <div>
                              <p className="card-small-label">Key dates</p>
                              <p className="card-small-text">{(mode.content.keyDates as string[])[0]}</p>
                              <p className="card-small-text">{(mode.content.keyDates as string[])[1]}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {mode.id === 3 && (
                      <div className="card-layout">
                        <h3 className="card-title">{mode.title}</h3>
                        <div className="card-content">
                          <div className="card-flashcard">
                            <img src={mode.content.picture as string} alt="Heart anatomy" className="flashcard-thumb" />
                            <p style={{ fontSize: '0.95rem', textAlign: 'center' }}>{mode.content.term as string}</p>
                            <div className="card-emoji">❤️</div>
                            <p className="card-small-text" style={{ textAlign: 'center' }}>
                              {mode.content.definition as string}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {mode.id === 4 && (
                      <div className="card-layout">
                        <h3 className="card-title">{mode.title}</h3>
                        <div className="card-tests">
                          <img src={mode.content.picture as string} alt="Student studying" className="card-banner" />
                          <div className="test-stats">
                            <div>
                              <p className="stat-label">Score</p>
                              <p className="stat-value">{mode.content.score as string}</p>
                            </div>
                            <div>
                              <p className="stat-label">Results</p>
                              <p className="stat-value">{mode.content.answers as string}</p>
                            </div>
                            <div>
                              <p className="stat-label">Total time</p>
                              <p className="stat-value">{mode.content.time as string}</p>
                            </div>
                          </div>
                          <div className="progress-bar" />
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="max-width-container">
          <h2 className="features-title">Master whatever you're learning</h2>
          <div className="features-grid">
            {[
              { title: 'Walk into every test with confidence', desc: 'Make your own flashcards or find sets made by teachers and students' },
              { title: 'Go from memorization to mastery', desc: '98% of students say WebEduc has improved their understanding' },
              { title: 'Get tailored study guidance', desc: 'Build strong habits and feel confident for every test' },
              { title: 'Turn it into a game', desc: 'Learn while having fun with interactive study games' },
            ].map((feature, i) => (
              <article key={i} className="feature-card">
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="stats">
        <div className="max-width-container">
          <h2>Join millions learning worldwide</h2>
          <div className="stats-grid">
            <article className="stat-item">
              <p>500M+</p>
              <p>Study sets created</p>
            </article>
            <article className="stat-item">
              <p>98%</p>
              <p>Improved understanding</p>
            </article>
            <article className="stat-item">
              <p>1B+</p>
              <p>Study sessions</p>
            </article>
          </div>
        </div>
      </section>

      <footer>
        <div className="max-width-container">
          <div className="footer-links">
            {['Company', 'Product', 'Learning', 'Teachers', 'Legal'].map((col) => (
              <div key={col} className="footer-column">
                <h4>{col}</h4>
                <ul>
                  <li><a href="#">Link</a></li>
                  <li><a href="#">Link</a></li>
                </ul>
              </div>
            ))}
          </div>
          <div className="footer-bottom">
            © 2026 WebEduc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
