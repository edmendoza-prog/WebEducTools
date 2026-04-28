import React, { useEffect, useState, useRef } from 'react';
import TeacherLayout from '../../components/ui/TeacherLayout';
import { csrfFetch } from '../../lib/csrf';
import { FileText, Upload, X } from 'lucide-react';

type TeacherClass = {
  id: number;
  name: string;
  subject: string;
};

type TeacherStudyGuide = {
  id: number;
  title: string;
  subject: string;
  content: string;
  imageUrl?: string | null;
  updatedAt: string;
  visibility?: string;
  uploadType?: string;
  filePath?: string | null;
  classId?: number | null;
  className?: string | null;
};

type MaterialDraft = {
  title: string;
  subject: string;
  classId: string;
  visibility: 'public' | 'private';
  uploadType: 'pdf' | 'powerpoint' | 'text';
  textContent: string;
};

export default function TeacherStudyGuides() {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [studyGuides, setStudyGuides] = useState<TeacherStudyGuide[]>([]);

  const [isMaterialFormOpen, setIsMaterialFormOpen] = useState(false);
  const [isMaterialCreating, setIsMaterialCreating] = useState(false);
  const [materialFormError, setMaterialFormError] = useState('');

  const [materialDraft, setMaterialDraft] = useState<MaterialDraft>({
    title: '',
    subject: '',
    classId: '',
    visibility: 'public',
    uploadType: 'pdf',
    textContent: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [classesRes, guidesRes] = await Promise.all([
          fetch('/api/classes', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
          fetch('/api/teacher/study-guides', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } }),
        ]);

        if (classesRes.ok) {
          const payload = (await classesRes.json()) as { classes?: TeacherClass[] };
          setClasses(payload.classes ?? []);
        }
        if (guidesRes.ok) {
          const payload = (await guidesRes.json()) as { studyGuides?: TeacherStudyGuide[] };
          setStudyGuides(payload.studyGuides ?? []);
        }
      } catch {
        // Keep empty state if unavailable.
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!isMaterialFormOpen) return undefined;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMaterialFormOpen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isMaterialFormOpen]);

  const refreshMaterials = async () => {
    const guidesRes = await fetch('/api/teacher/study-guides', { method: 'GET', credentials: 'include', headers: { Accept: 'application/json' } });
    if (guidesRes.ok) {
      const p = (await guidesRes.json()) as { studyGuides?: TeacherStudyGuide[] };
      setStudyGuides(p.studyGuides ?? []);
    }
  };

  const createMaterial = async () => {
    const title = materialDraft.title.trim();
    const subject = materialDraft.subject.trim();
    const classId = materialDraft.classId.trim();

    if (!title) { setMaterialFormError('Title is required.'); return; }
    if (!subject) { setMaterialFormError('Subject is required.'); return; }
    if (!classId) { setMaterialFormError('Please select a class.'); return; }
    if (materialDraft.uploadType === 'text' && !materialDraft.textContent.trim()) { 
      setMaterialFormError('Text content is required.'); 
      return; 
    }
    if (materialDraft.uploadType !== 'text' && !selectedFile) { 
      setMaterialFormError('Please select a file to upload.'); 
      return; 
    }

    setIsMaterialCreating(true);
    setMaterialFormError('');

    try {
      // Prepare form data for file upload
      const formData = new FormData();
      formData.append('title', title);
      formData.append('subject', subject);
      formData.append('classId', classId);
      formData.append('visibility', materialDraft.visibility);
      formData.append('uploadType', materialDraft.uploadType);
      
      if (materialDraft.uploadType === 'text') {
        formData.append('content', materialDraft.textContent);
      } else if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await csrfFetch('/api/teacher/study-guides', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) { setMaterialFormError('Unable to upload lesson right now.'); return; }

      await refreshMaterials();
      setIsMaterialFormOpen(false);
      setMaterialDraft({ title: '', subject: '', classId: '', visibility: 'public', uploadType: 'pdf', textContent: '' });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      setMaterialFormError('Unable to upload lesson right now.');
    } finally {
      setIsMaterialCreating(false);
    }
  };

  return (
    <TeacherLayout>
      {() => (
        <div className="td-dashboard-grid">
          <section className="td-panel td-panel-span-2">
            <div className="td-panel-head">
              <h2>Study Material Management</h2>
              <button className="td-inline-action" type="button" onClick={() => setIsMaterialFormOpen(true)}>
                <Upload size={14} /> Upload lessons
              </button>
            </div>
            <div className="td-stack-list">
              {studyGuides.length === 0 ? (
                <p className="td-empty-state">No lessons uploaded yet.</p>
              ) : (
                <>
                  {studyGuides.map((guide) => (
                    <article key={`guide-${guide.id}`} className="td-stack-item td-stack-item-column">
                      <div>
                        <h3>{guide.title}</h3>
                        <p>Lesson · {guide.subject} {guide.className ? `· ${guide.className}` : ''}</p>
                      </div>
                      <div className="td-mini-metrics">
                        <span>{guide.updatedAt}</span>
                        <span>
                          {guide.uploadType === 'pdf' && 'PDF Document'}
                          {guide.uploadType === 'powerpoint' && 'PowerPoint'}
                          {guide.uploadType === 'text' && 'Text Content'}
                          {!guide.uploadType && `${guide.content?.length || 0} chars`}
                        </span>
                      </div>
                    </article>
                  ))}
                </>
              )}
            </div>
          </section>

          {isMaterialFormOpen && (
            <div className="td-badge-overlay" role="presentation" onClick={() => setIsMaterialFormOpen(false)} style={{ gridTemplateColumns: '200px 1fr' }}>
              <div></div>
              <div style={{ display: 'grid', placeItems: 'center', paddingRight: '200px' }}>
                <div className="td-badge-frame" role="dialog" aria-modal="true" aria-labelledby="material-form-title" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1100px', width: '100%' }}>
                  <section className="td-badge-modal">
                    <div className="td-badge-modal-head">
                      <div>
                        <h2 id="material-form-title">Upload Lessons</h2>
                        <p>Upload PDF, PowerPoint, or enter text content.</p>
                      </div>
                      <button className="tcc-inline-icon" type="button" aria-label="Close" onClick={() => setIsMaterialFormOpen(false)}>
                        <X size={16} />
                      </button>
                  </div>
                  <div className="tcc-meta-grid td-badge-form-grid td-material-form-grid">
                    <label style={{ gridColumn: '1 / -1' }}>
                      Title
                      <input value={materialDraft.title} onChange={(e) => setMaterialDraft((d) => ({ ...d, title: e.target.value }))} type="text" placeholder="Enter lesson title" />
                    </label>
                    <label style={{ gridColumn: '1 / -1' }}>
                      Subject
                      <input value={materialDraft.subject} onChange={(e) => setMaterialDraft((d) => ({ ...d, subject: e.target.value }))} type="text" placeholder="Enter subject" />
                    </label>
                    <label style={{ gridColumn: '1 / -1' }}>
                      Class
                      <select value={materialDraft.classId} onChange={(e) => setMaterialDraft((d) => ({ ...d, classId: e.target.value }))}>
                        <option value="">Select a class</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>{cls.name} - {cls.subject}</option>
                        ))}
                      </select>
                    </label>
                    <label style={{ gridColumn: '1 / -1' }}>
                      Visibility
                      <select value={materialDraft.visibility} onChange={(e) => setMaterialDraft((d) => ({ ...d, visibility: e.target.value as 'public' | 'private' }))}>
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </label>
                    <label style={{ gridColumn: '1 / -1' }}>
                      Upload Type
                      <select value={materialDraft.uploadType} onChange={(e) => {
                        const newType = e.target.value as 'pdf' | 'powerpoint' | 'text';
                        setMaterialDraft((d) => ({ ...d, uploadType: newType }));
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}>
                        <option value="pdf">PDF Document</option>
                        <option value="powerpoint">PowerPoint Presentation</option>
                        <option value="text">Text Content</option>
                      </select>
                    </label>
                    {materialDraft.uploadType === 'text' ? (
                      <label className="td-badge-description" style={{ gridColumn: '1 / -1' }}>
                        Text Content
                        <textarea value={materialDraft.textContent} onChange={(e) => setMaterialDraft((d) => ({ ...d, textContent: e.target.value }))} rows={5} placeholder="Enter your lesson content here..." />
                      </label>
                    ) : (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: '8px' }}>
                          {materialDraft.uploadType === 'pdf' ? 'Upload PDF' : 'Upload PowerPoint'}
                        </label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={materialDraft.uploadType === 'pdf' ? '.pdf' : '.ppt,.pptx'}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            setSelectedFile(file || null);
                          }}
                          style={{ display: 'block', width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                        />
                        {selectedFile && (
                          <p style={{ marginTop: '8px', fontSize: '0.875rem', color: '#666' }}>
                            <FileText size={14} style={{ display: 'inline', marginRight: '4px' }} />
                            {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {materialFormError ? <p className="td-material-form-error">{materialFormError}</p> : null}
                  <div className="td-badge-modal-actions">
                    <button className="td-inline-action td-badge-save-action" type="button" onClick={createMaterial} disabled={isMaterialCreating}>
                      {isMaterialCreating ? 'Uploading...' : 'Upload Lesson'}
                    </button>
                    <button className="tcc-chip-toggle" type="button" onClick={() => setIsMaterialFormOpen(false)} disabled={isMaterialCreating}>Cancel</button>
                  </div>
                </section>
              </div>
            </div>
            </div>
          )}
        </div>
      )}
    </TeacherLayout>
  );
}

