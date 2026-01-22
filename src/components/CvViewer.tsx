import { useEffect } from 'react';
import type { Candidate } from '../types';
import './CvViewer.css';

interface CvViewerProps {
  candidate: Candidate;
  onClose: () => void;
}

const candidateCvData: Record<string, {
  summary: string;
  experience: { title: string; company: string; period: string; description: string }[];
  education: { degree: string; school: string; year: string }[];
}> = {
  'cand-001': {
    summary: 'Passionate frontend developer with 5+ years of experience building modern web applications using React and TypeScript. Strong focus on user experience and performance optimization.',
    experience: [
      { title: 'Senior Frontend Developer', company: 'TechCorp Inc.', period: '2021 - Present', description: 'Led development of React-based dashboard serving 100k+ users. Implemented design system reducing development time by 40%.' },
      { title: 'Frontend Developer', company: 'StartupXYZ', period: '2019 - 2021', description: 'Built responsive web applications using React and Node.js. Collaborated with design team on UI/UX improvements.' },
    ],
    education: [
      { degree: 'B.S. Computer Science', school: 'MIT', year: '2019' },
    ],
  },
  'cand-002': {
    summary: 'Backend developer specializing in Python and Django with expertise in building scalable APIs and microservices. Experienced in database optimization and cloud architecture.',
    experience: [
      { title: 'Backend Engineer', company: 'DataFlow Systems', period: '2020 - Present', description: 'Designed and implemented RESTful APIs handling 1M+ daily requests. Optimized PostgreSQL queries improving response time by 60%.' },
      { title: 'Junior Developer', company: 'CodeBase LLC', period: '2018 - 2020', description: 'Developed backend services using Python and Django. Maintained CI/CD pipelines for automated deployments.' },
    ],
    education: [
      { degree: 'M.S. Software Engineering', school: 'Stanford University', year: '2018' },
    ],
  },
  'cand-003': {
    summary: 'Full-stack developer with expertise in both frontend and backend technologies. AWS certified with strong experience in cloud infrastructure and DevOps practices.',
    experience: [
      { title: 'Full Stack Developer', company: 'CloudTech Solutions', period: '2019 - Present', description: 'Developed end-to-end features using React frontend and Python backend. Managed AWS infrastructure for high-availability applications.' },
      { title: 'Software Engineer', company: 'WebDev Agency', period: '2017 - 2019', description: 'Built custom web solutions for clients using various tech stacks. Led migration of legacy systems to modern cloud architecture.' },
    ],
    education: [
      { degree: 'B.S. Information Technology', school: 'UC Berkeley', year: '2017' },
    ],
  },
  'cand-004': {
    summary: 'Platform engineer with deep expertise in cloud-native technologies and container orchestration. Passionate about building reliable, scalable infrastructure.',
    experience: [
      { title: 'Senior Platform Engineer', company: 'ScaleUp Technologies', period: '2020 - Present', description: 'Architected Kubernetes clusters handling 10k+ pods. Reduced deployment time by 70% through GitOps implementation.' },
      { title: 'DevOps Engineer', company: 'CloudFirst Inc.', period: '2018 - 2020', description: 'Managed multi-cloud infrastructure across AWS and GCP. Implemented infrastructure as code using Terraform.' },
    ],
    education: [
      { degree: 'B.S. Computer Engineering', school: 'Carnegie Mellon', year: '2018' },
    ],
  },
  'cand-005': {
    summary: 'Creative UX designer with a user-centered approach to problem solving. Expert in transforming complex requirements into intuitive, accessible interfaces.',
    experience: [
      { title: 'Lead UX Designer', company: 'DesignHub Studio', period: '2021 - Present', description: 'Led design system initiatives improving design consistency across 12 products. Conducted user research informing major product decisions.' },
      { title: 'UX Designer', company: 'Creative Solutions', period: '2019 - 2021', description: 'Designed mobile and web interfaces for fintech applications. Increased user task completion rate by 35% through redesign.' },
    ],
    education: [
      { degree: 'M.A. Interaction Design', school: 'RISD', year: '2019' },
    ],
  },
  'cand-006': {
    summary: 'Systems programmer specializing in Go and Rust for high-performance distributed systems. Strong background in network protocols and low-level optimization.',
    experience: [
      { title: 'Senior Systems Engineer', company: 'HighPerf Labs', period: '2019 - Present', description: 'Built distributed message queue processing 5M messages/second. Optimized memory usage reducing infrastructure costs by 40%.' },
      { title: 'Backend Developer', company: 'NetCore Systems', period: '2017 - 2019', description: 'Developed microservices using Go for real-time trading platform. Implemented custom gRPC middleware for observability.' },
    ],
    education: [
      { degree: 'M.S. Computer Science', school: 'Georgia Tech', year: '2017' },
    ],
  },
  'cand-007': {
    summary: 'Machine learning engineer with expertise in deep learning and natural language processing. Focused on deploying production-ready ML systems at scale.',
    experience: [
      { title: 'ML Engineer', company: 'AI Innovations', period: '2021 - Present', description: 'Developed NLP models achieving 95% accuracy on sentiment analysis. Built ML pipelines processing 100k+ documents daily.' },
      { title: 'Data Scientist', company: 'DataMind Corp', period: '2019 - 2021', description: 'Created recommendation engine increasing user engagement by 25%. Implemented A/B testing framework for model evaluation.' },
    ],
    education: [
      { degree: 'Ph.D. Machine Learning', school: 'Cornell University', year: '2019' },
    ],
  },
  'cand-008': {
    summary: 'Mobile developer experienced in cross-platform development with React Native. Strong focus on performance optimization and native module integration.',
    experience: [
      { title: 'Senior Mobile Developer', company: 'AppCraft Studios', period: '2020 - Present', description: 'Led development of React Native app with 500k+ downloads. Reduced app bundle size by 45% through code splitting.' },
      { title: 'Mobile Developer', company: 'MobileFirst Inc.', period: '2018 - 2020', description: 'Built cross-platform apps for iOS and Android using React Native. Integrated native modules for camera and biometric authentication.' },
    ],
    education: [
      { degree: 'B.S. Software Engineering', school: 'University of Washington', year: '2018' },
    ],
  },
  'cand-009': {
    summary: 'Technical project manager with 8+ years of experience leading software teams. Certified Scrum Master with track record of delivering complex projects on time.',
    experience: [
      { title: 'Senior Technical PM', company: 'TechLead Consulting', period: '2020 - Present', description: 'Managed portfolio of 5 projects with combined budget of $2M. Improved team velocity by 30% through process optimization.' },
      { title: 'Technical Project Manager', company: 'Agile Solutions', period: '2017 - 2020', description: 'Led cross-functional teams of 12+ engineers. Implemented agile practices reducing time-to-market by 40%.' },
    ],
    education: [
      { degree: 'MBA', school: 'Harvard Business School', year: '2017' },
      { degree: 'B.S. Computer Science', school: 'UCLA', year: '2014' },
    ],
  },
};

const defaultCvData = {
  summary: 'Experienced professional with a strong background in software development and problem-solving skills.',
  experience: [
    { title: 'Software Developer', company: 'Tech Company', period: '2020 - Present', description: 'Developed and maintained software applications using modern technologies.' },
  ],
  education: [
    { degree: 'B.S. Computer Science', school: 'University', year: '2020' },
  ],
};

export function CvViewer({ candidate, onClose }: CvViewerProps) {
  const cvData = candidateCvData[candidate.id] || defaultCvData;
  const skills = candidate.skills ?? [];

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="cv-modal-backdrop" onClick={handleBackdropClick}>
      <div className="cv-modal" role="dialog" aria-labelledby="cv-title">
        <button className="cv-close-btn" onClick={onClose} aria-label="Close CV" />
        <div className="cv-content">
          <header className="cv-header">
            <h1 id="cv-title">{candidate.name}</h1>
            <div className="cv-contact">
              <span>{candidate.email}</span>
              <span>{candidate.phone}</span>
            </div>
          </header>

          <section className="cv-section">
            <h2>Professional Summary</h2>
            <p>{cvData.summary}</p>
          </section>

          <section className="cv-section">
            <h2>Skills</h2>
            <div className="cv-skills">
              {skills.map((skill) => (
                <span key={skill} className="cv-skill-tag">{skill}</span>
              ))}
            </div>
          </section>

          <section className="cv-section">
            <h2>Work Experience</h2>
            {cvData.experience.map((exp, index) => (
              <div key={index} className="cv-experience-item">
                <div className="cv-exp-header">
                  <strong>{exp.title}</strong>
                  <span className="cv-exp-period">{exp.period}</span>
                </div>
                <div className="cv-exp-company">{exp.company}</div>
                <p className="cv-exp-description">{exp.description}</p>
              </div>
            ))}
          </section>

          <section className="cv-section">
            <h2>Education</h2>
            {cvData.education.map((edu, index) => (
              <div key={index} className="cv-education-item">
                <strong>{edu.degree}</strong>
                <span>{edu.school}, {edu.year}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
