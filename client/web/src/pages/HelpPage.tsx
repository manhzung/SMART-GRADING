import { useState } from 'react';
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  ChevronUp,
  Book,
  FileText,
  Scan,
  Users,
  Mail,
  Phone,
  Clock,
  ExternalLink,
  MessageCircle,
  Keyboard
} from 'lucide-react';
import styles from './HelpPage.module.css';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  items: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Book,
    items: [
      {
        id: 'gs-1',
        question: 'How do I log in to the Smart Grading system?',
        answer: 'To log in, visit the login page and enter the email and password provided by your administrator. If you do not have an account yet, please contact your school administrator to request one.'
      },
      {
        id: 'gs-2',
        question: 'I forgot my password, what should I do?',
        answer: 'Click the "Forgot Password?" link on the login page and enter your registered email. The system will send password reset instructions to your inbox. Check your spam folder if you do not receive it.'
      },
      {
        id: 'gs-3',
        question: 'What are the user roles in the system?',
        answer: 'The system has 4 main roles: (1) Admin - manages the entire system, (2) Teacher - creates and manages exams, (3) Student - takes exams and views results, and (4) Parent - monitors their children\'s learning progress.'
      },
      {
        id: 'gs-4',
        question: 'How do I update my personal information?',
        answer: 'Go to the "Settings" page and select the "Profile" tab. Here you can edit your full name, email, phone number, and upload a profile photo. Click "Save Changes" to update.'
      },
      {
        id: 'gs-5',
        question: 'Which languages are supported by the system?',
        answer: 'Currently, the system supports Vietnamese and English. You can change your language preference on the "Settings" page under the "Preferences" tab.'
      }
    ]
  },
  {
    id: 'exams-grading',
    title: 'Exams & Grading',
    icon: FileText,
    items: [
      {
        id: 'eg-1',
        question: 'How do I create a new exam?',
        answer: 'From the "Exams" page, click the "Create Exam" button. Fill in the basic details (title, subject, class, date, duration), and then add questions from the question bank or create new ones. Finally, click "Save Draft" or "Publish" to finish.'
      },
      {
        id: 'eg-2',
        question: 'Can I create multiple versions of an exam?',
        answer: 'Yes, when creating an exam, you can specify the number of versions (1-10 versions). The system will automatically shuffle the questions and answers to generate different versions, helping prevent exam cheating.'
      },
      {
        id: 'eg-3',
        question: 'How do I view exam results?',
        answer: 'Once an exam is completed, navigate to the "Exams" page > select your exam > go to the "Results" tab. Here you can view the list of students, scores, submission rates, and detailed statistics. You can also export reports to Excel or PDF.'
      },
      {
        id: 'eg-4',
        question: 'How does the automatic grading system work?',
        answer: 'For multiple-choice questions, the system uses OMR (Optical Mark Recognition) technology to read answer sheets and grade them automatically with high accuracy. Results are updated immediately after scanning and processing.'
      },
      {
        id: 'eg-5',
        question: 'How is the score appeal process handled?',
        answer: 'Students can submit an appeal request within 7 days of results release. Teachers will receive a notification to review and respond. Appeal statuses include: Pending, Reviewing, Approved, or Rejected.'
      }
    ]
  },
  {
    id: 'omr-scanning',
    title: 'OMR Scanning',
    icon: Scan,
    items: [
      {
        id: 'omr-1',
        question: 'How do I scan OMR answer sheets?',
        answer: 'Go to the "Scan" page and select the exam to process. You can upload image files of the answer sheets or use your camera directly. The system will automatically recognize answers and calculate scores. Ensure the photos are clear and match the template.'
      },
      {
        id: 'omr-2',
        question: 'What do I need to prepare for OMR scanning?',
        answer: 'You will need: (1) A printer to print answer sheets according to the template, (2) A scanner or phone camera, and (3) Clear image files in JPG/PNG format (under 10MB). A dedicated scanner is recommended for best results.'
      },
      {
        id: 'omr-3',
        question: 'What should I do if an answer sheet is scanned incorrectly?',
        answer: 'If an answer sheet is misidentified, you can go to the "Submission Details" page, select the specific sheet, and click "Manual Override" to edit the answers. The system will log this as a manual adjustment and update the score.'
      },
      {
        id: 'omr-4',
        question: 'Can I scan multiple sheets at once?',
        answer: 'Yes, you can upload a ZIP file containing multiple answer sheet images or scan them in batches. The system will process them sequentially and display the results for each sheet. Ensure each image contains only one answer sheet.'
      }
    ]
  },
  {
    id: 'account-settings',
    title: 'Account & Settings',
    icon: Users,
    items: [
      {
        id: 'as-1',
        question: 'How do I change my password?',
        answer: 'Go to "Settings" > "Security" tab. In the "Change Password" section, enter your current password and your new password (at least 8 characters). Click "Change Password" to complete. We recommend using a strong password with uppercase, lowercase, numbers, and special characters.'
      },
      {
        id: 'as-2',
        question: 'What is Two-Factor Authentication (2FA) and is it mandatory?',
        answer: '2FA is an extra layer of security that requires entering a verification code from your phone when logging in. It is not mandatory but highly recommended to secure your account, especially for administrators.'
      },
      {
        id: 'as-3',
        question: 'How do I view and manage active sessions?',
        answer: 'Navigate to "Settings" > "Security" tab > "Active Sessions" section. Here you can see a list of devices currently logged in, including browser details, location, and activity times. Click the trash icon to log out of any session.'
      },
      {
        id: 'as-4',
        question: 'Can I change the display theme?',
        answer: 'Yes, go to "Settings" > "Preferences" tab. You can select from 3 modes: Light (light background), Dark (dark background), or Auto (matches your system settings). The changes are applied instantly.'
      }
    ]
  }
];

const quickGuides = [
  {
    id: 'qg-1',
    title: 'Creating Exams',
    description: 'Step-by-step guide to creating a new exam',
    icon: FileText,
    link: '/guides/create-exam'
  },
  {
    id: 'qg-2',
    title: 'Scanning OMR Sheets',
    description: 'How to use the automatic scanning feature',
    icon: Scan,
    link: '/guides/omr-scan'
  },
  {
    id: 'qg-3',
    title: 'Viewing Submissions',
    description: 'Manage results and export exam reports',
    icon: Users,
    link: '/guides/view-results'
  },
  {
    id: 'qg-4',
    title: 'Handling Appeals',
    description: 'How to review and manage student appeal requests',
    icon: MessageCircle,
    link: '/guides/appeals'
  }
];

const keyboardShortcuts = [
  { keys: ['Ctrl', 'N'], action: 'Create new exam' },
  { keys: ['Ctrl', 'S'], action: 'Save changes' },
  { keys: ['Ctrl', 'F'], action: 'Search' },
  { keys: ['Escape'], action: 'Close dialog' },
  { keys: ['Ctrl', 'P'], action: 'Print/Export report' }
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter FAQs by search query
  const filteredCategories = faqCategories.map(category => ({
    ...category,
    items: category.items.filter(item => 
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  return (
    <div className={styles.container}>
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <span>Workspace</span>
        <span className={styles.breadcrumbSeparator}>&gt;</span>
        <span className={styles.breadcrumbActive}>Help</span>
      </nav>

      {/* Title */}
      <div className={styles.header}>
        <h1 className={styles.title}>Help Center</h1>
        <p className={styles.subtitle}>Find answers to frequently asked questions</p>
      </div>

      {/* Search Section */}
      <div className={styles.searchSection}>
        <div className={styles.searchWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Quick Guides */}
      <div className={styles.quickGuidesSection}>
        <h2 className={styles.sectionTitle}>Quick Guides</h2>
        <div className={styles.quickGuidesGrid}>
          {quickGuides.map(guide => (
            <a key={guide.id} href={guide.link} className={styles.quickGuideCard}>
              <div className={styles.quickGuideIcon}>
                <guide.icon size={24} />
              </div>
              <div className={styles.quickGuideContent}>
                <h3 className={styles.quickGuideTitle}>{guide.title}</h3>
                <p className={styles.quickGuideDesc}>{guide.description}</p>
              </div>
              <ExternalLink size={16} className={styles.quickGuideArrow} />
            </a>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className={styles.faqSection}>
        <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
        
        {filteredCategories.length === 0 ? (
          <div className={styles.noResults}>
            <HelpCircle size={48} />
            <p>No matching questions found</p>
            <span>Try searching with different keywords</span>
          </div>
        ) : (
          filteredCategories.map(category => (
            <div key={category.id} className={styles.faqCategory}>
              <div className={styles.categoryHeader}>
                <category.icon size={20} />
                <h3 className={styles.categoryTitle}>{category.title}</h3>
                <span className={styles.categoryCount}>{category.items.length} questions</span>
              </div>
              
              <div className={styles.faqList}>
                {category.items.map(item => {
                  const isExpanded = expandedItems.has(item.id);
                  return (
                    <div 
                      key={item.id} 
                      className={`${styles.faqItem} ${isExpanded ? styles.faqItemExpanded : ''}`}
                    >
                      <button 
                        className={styles.faqQuestion}
                        onClick={() => toggleExpand(item.id)}
                      >
                        <span>{item.question}</span>
                        {isExpanded ? (
                          <ChevronUp size={18} className={styles.faqChevron} />
                        ) : (
                          <ChevronDown size={18} className={styles.faqChevron} />
                        )}
                      </button>
                      {isExpanded && (
                        <div className={styles.faqAnswer}>
                          <p>{item.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Contact Support */}
      <div className={styles.contactSection}>
        <h2 className={styles.sectionTitle}>Contact Support</h2>
        <p className={styles.contactDesc}>If you need further assistance, please contact us through the following channels:</p>
        
        <div className={styles.contactCards}>
          <div className={styles.contactCard}>
            <div className={styles.contactIcon}>
              <Mail size={22} />
            </div>
            <div className={styles.contactInfo}>
              <h4>Email</h4>
              <a href="mailto:support@smartgrading.edu.vn" className={styles.contactLink}>
                support@smartgrading.edu.vn
              </a>
            </div>
          </div>

          <div className={styles.contactCard}>
            <div className={styles.contactIcon}>
              <Phone size={22} />
            </div>
            <div className={styles.contactInfo}>
              <h4>Phone</h4>
              <a href="tel:19001234" className={styles.contactLink}>
                1900 1234
              </a>
            </div>
          </div>

          <div className={styles.contactCard}>
            <div className={styles.contactIcon}>
              <Clock size={22} />
            </div>
            <div className={styles.contactInfo}>
              <h4>Working Hours</h4>
              <span className={styles.contactText}>
                Mon - Fri: 8:00 - 17:00
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className={styles.shortcutsSection}>
        <button 
          className={styles.shortcutsToggle}
          onClick={() => setShowShortcuts(!showShortcuts)}
        >
          <Keyboard size={18} />
          <span>Keyboard Shortcuts</span>
          {showShortcuts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {showShortcuts && (
          <div className={styles.shortcutsList}>
            {keyboardShortcuts.map((shortcut, index) => (
              <div key={index} className={styles.shortcutItem}>
                <div className={styles.shortcutKeys}>
                  {shortcut.keys.map((key, i) => (
                    <span key={i}>
                      <kbd className={styles.kbd}>{key}</kbd>
                      {i < shortcut.keys.length - 1 && <span className={styles.keyPlus}>+</span>}
                    </span>
                  ))}
                </div>
                <span className={styles.shortcutAction}>{shortcut.action}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
