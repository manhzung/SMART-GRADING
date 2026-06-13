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
    title: 'Bắt đầu',
    icon: Book,
    items: [
      {
        id: 'gs-1',
        question: 'Làm sao để đăng nhập vào hệ thống Smart Grading?',
        answer: 'Để đăng nhập, bạn cần truy cập trang đăng nhập và nhập email cùng mật khẩu đã được quản trị viên cấp. Nếu chưa có tài khoản, vui lòng liên hệ quản trị viên của trường để được tạo tài khoản.'
      },
      {
        id: 'gs-2',
        question: 'Tôi quên mật khẩu, phải làm sao?',
        answer: 'Nhấn vào link "Quên mật khẩu" trên trang đăng nhập, nhập email đã đăng ký. Hệ thống sẽ gửi email hướng dẫn đặt lại mật khẩu. Kiểm tra hòm thư spam nếu không nhận được email.'
      },
      {
        id: 'gs-3',
        question: 'Các vai trò người dùng trong hệ thống là gì?',
        answer: 'Hệ thống có 4 vai trò chính: (1) Quản trị viên - quản lý toàn bộ hệ thống, (2) Giáo viên - tạo và quản lý bài thi, (3) Học sinh - tham gia thi và xem kết quả, (4) Phụ huynh - theo dõi kết quả học tập của con em.'
      },
      {
        id: 'gs-4',
        question: 'Làm sao để cập nhật thông tin cá nhân?',
        answer: 'Truy cập trang "Cài đặt" (Settings), chọn tab "Hồ sơ" (Profile). Tại đây bạn có thể thay đổi họ tên, email, số điện thoại và upload ảnh đại diện. Nhấn "Lưu thay đổi" để cập nhật.'
      },
      {
        id: 'gs-5',
        question: 'Hệ thống hỗ trợ những ngôn ngữ nào?',
        answer: 'Hiện tại hệ thống hỗ trợ Tiếng Việt và Tiếng Anh. Bạn có thể thay đổi ngôn ngữ tại trang "Cài đặt" > tab "Tùy chọn" > chọn ngôn ngữ mong muốn.'
      }
    ]
  },
  {
    id: 'exams-grading',
    title: 'Bài thi & Chấm điểm',
    icon: FileText,
    items: [
      {
        id: 'eg-1',
        question: 'Làm sao để tạo một bài thi mới?',
        answer: 'Từ trang "Quản lý bài thi", nhấn nút "Tạo bài thi mới". Điền thông tin cơ bản (tên bài thi, môn học, lớp, ngày thi, thời gian), sau đó thêm câu hỏi từ ngân hàng câu hỏi hoặc tạo mới. Cuối cùng, nhấn "Lưu nháp" hoặc "Xuất bản" để hoàn tất.'
      },
      {
        id: 'eg-2',
        question: 'Tôi có thể tạo nhiều phiên bản đề thi không?',
        answer: 'Có, khi tạo bài thi, bạn có thể chọn số lượng phiên bản đề (1-10 phiên bản). Hệ thống sẽ tự động xáo trộn câu hỏi và đáp án để tạo các phiên bản khác nhau, giúp ngăn chặn gian lận thi cử.'
      },
      {
        id: 'eg-3',
        question: 'Làm sao xem lại kết quả chấm điểm?',
        answer: 'Sau khi bài thi hoàn thành, vào trang "Bài thi" > chọn bài thi > tab "Kết quả". Tại đây bạn có thể xem danh sách học sinh, điểm số, tỷ lệ nộp bài và thống kê chi tiết. Có thể xuất báo cáo dưới dạng Excel hoặc PDF.'
      },
      {
        id: 'eg-4',
        question: 'Hệ thống chấm điểm tự động như thế nào?',
        answer: 'Với các câu hỏi trắc nghiệm, hệ thống sử dụng công nghệ OMR (Optical Mark Recognition) để đọc phiếu trả lời và chấm điểm tự động với độ chính xác cao. Kết quả được cập nhật ngay sau khi quét và xử lý xong.'
      },
      {
        id: 'eg-5',
        question: 'Phúc khảo điểm được thực hiện như thế nào?',
        answer: 'Học sinh có thể gửi yêu cầu phúc khảo trong vòng 7 ngày kể từ khi có kết quả. Giáo viên sẽ nhận được thông báo, xem xét và phản hồi. Trạng thái phúc khảo có thể là: Đang chờ, Đang xem xét, Đồng ý, hoặc Từ chối.'
      }
    ]
  },
  {
    id: 'omr-scanning',
    title: 'Quét OMR',
    icon: Scan,
    items: [
      {
        id: 'omr-1',
        question: 'Làm sao để quét phiếu trả lời OMR?',
        answer: 'Vào trang "Quét" (Scan), chọn bài thi cần xử lý. Bạn có thể tải lên file ảnh của phiếu trả lời hoặc sử dụng camera trực tiếp. Hệ thống sẽ tự động nhận diện và chấm điểm. Đảm bảo ảnh rõ nét, đúng định dạng template.'
      },
      {
        id: 'omr-2',
        question: 'Tôi cần chuẩn bị gì để quét OMR?',
        answer: 'Bạn cần: (1) Máy in để in phiếu trả lời theo đúng template, (2) Máy quét hoặc điện thoại có camera, (3) File ảnh phải rõ nét, định dạng JPG/PNG, dung lượng dưới 10MB. Khuyến nghị sử dụng máy quét chuyên dụng để đạt kết quả tốt nhất.'
      },
      {
        id: 'omr-3',
        question: 'Phiếu bị quét sai, tôi phải làm gì?',
        answer: 'Nếu phiếu bị nhận diện sai, bạn có thể vào trang "Chi tiết bài nộp", chọn phiếu cần sửa và nhấn "Điều chỉnh thủ công" để chỉnh sửa kết quả. Hệ thống sẽ ghi nhận đây là điều chỉnh tay và cập nhật lại điểm.'
      },
      {
        id: 'omr-4',
        question: 'Có thể quét nhiều phiếu cùng lúc không?',
        answer: 'Có, bạn có thể tải lên file ZIP chứa nhiều ảnh phiếu trả lời hoặc quét hàng loạt từng phiếu. Hệ thống sẽ xử lý tuần tự và hiển thị kết quả cho từng phiếu. Đảm bảo mỗi ảnh chỉ chứa một phiếu trả lời.'
      }
    ]
  },
  {
    id: 'account-settings',
    title: 'Tài khoản & Cài đặt',
    icon: Users,
    items: [
      {
        id: 'as-1',
        question: 'Làm sao đổi mật khẩu?',
        answer: 'Truy cập "Cài đặt" > tab "Bảo mật". Trong phần "Đổi mật khẩu", nhập mật khẩu hiện tại và mật khẩu mới (ít nhất 8 ký tự). Nhấn "Đổi mật khẩu" để hoàn tất. Khuyến nghị sử dụng mật khẩu mạnh bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.'
      },
      {
        id: 'as-2',
        question: 'Xác thực hai yếu tố (2FA) là gì và có bắt buộc không?',
        answer: '2FA là lớp bảo mật bổ sung yêu cầu nhập mã từ điện thoại mỗi khi đăng nhập. Tính năng này không bắt buộc nhưng khuyến nghị bật để tăng cường bảo mật tài khoản, đặc biệt với tài khoản quản trị.'
      },
      {
        id: 'as-3',
        question: 'Làm sao xem và quản lý các phiên đăng nhập?',
        answer: 'Vào "Cài đặt" > tab "Bảo mật" > phần "Phiên làm việc đang hoạt động". Tại đây bạn có thể xem danh sách các thiết bị đang đăng nhập, bao gồm trình duyệt, vị trí và thời gian hoạt động. Nhấn biểu tượng thùng rác để đăng xuất từng phiên.'
      },
      {
        id: 'as-4',
        question: 'Tôi có thể thay đổi giao diện (theme) không?',
        answer: 'Có, vào "Cài đặt" > tab "Tùy chọn". Bạn có thể chọn giữa 3 chế độ: Sáng (nền sáng), Tối (nền tối), hoặc Tự động (theo cài đặt hệ thống). Thay đổi sẽ được áp dụng ngay lập tức.'
      }
    ]
  }
];

const quickGuides = [
  {
    id: 'qg-1',
    title: 'Cách tạo bài thi',
    description: 'Hướng dẫn từng bước tạo bài thi mới',
    icon: FileText,
    link: '/guides/create-exam'
  },
  {
    id: 'qg-2',
    title: 'Quét phiếu OMR',
    description: 'Cách sử dụng tính năng quét tự động',
    icon: Scan,
    link: '/guides/omr-scan'
  },
  {
    id: 'qg-3',
    title: 'Xem kết quả nộp bài',
    description: 'Quản lý và xuất báo cáo điểm thi',
    icon: Users,
    link: '/guides/view-results'
  },
  {
    id: 'qg-4',
    title: 'Xử lý phúc khảo',
    description: 'Cách duyệt và quản lý yêu cầu phúc khảo',
    icon: MessageCircle,
    link: '/guides/appeals'
  }
];

const keyboardShortcuts = [
  { keys: ['Ctrl', 'N'], action: 'Tạo bài thi mới' },
  { keys: ['Ctrl', 'S'], action: 'Lưu thay đổi' },
  { keys: ['Ctrl', 'F'], action: 'Tìm kiếm' },
  { keys: ['Escape'], action: 'Đóng hộp thoại' },
  { keys: ['Ctrl', 'P'], action: 'In/Xuất báo cáo' }
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
        <span className={styles.breadcrumbActive}>Trợ giúp</span>
      </nav>

      {/* Title */}
      <div className={styles.header}>
        <h1 className={styles.title}>Trung tâm trợ giúp</h1>
        <p className={styles.subtitle}>Tìm câu trả lời cho các câu hỏi thường gặp</p>
      </div>

      {/* Search Section */}
      <div className={styles.searchSection}>
        <div className={styles.searchWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Tìm kiếm câu hỏi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

      {/* Quick Guides */}
      <div className={styles.quickGuidesSection}>
        <h2 className={styles.sectionTitle}>Hướng dẫn nhanh</h2>
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
        <h2 className={styles.sectionTitle}>Câu hỏi thường gặp</h2>
        
        {filteredCategories.length === 0 ? (
          <div className={styles.noResults}>
            <HelpCircle size={48} />
            <p>Không tìm thấy câu hỏi phù hợp</p>
            <span>Thử thay đổi từ khóa tìm kiếm</span>
          </div>
        ) : (
          filteredCategories.map(category => (
            <div key={category.id} className={styles.faqCategory}>
              <div className={styles.categoryHeader}>
                <category.icon size={20} />
                <h3 className={styles.categoryTitle}>{category.title}</h3>
                <span className={styles.categoryCount}>{category.items.length} câu hỏi</span>
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
        <h2 className={styles.sectionTitle}>Liên hệ hỗ trợ</h2>
        <p className={styles.contactDesc}>Nếu bạn cần thêm hỗ trợ, vui lòng liên hệ với chúng tôi qua các kênh sau:</p>
        
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
              <h4>Điện thoại</h4>
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
              <h4>Giờ làm việc</h4>
              <span className={styles.contactText}>
                Thứ 2 - Thứ 6: 8:00 - 17:00
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts (Optional) */}
      <div className={styles.shortcutsSection}>
        <button 
          className={styles.shortcutsToggle}
          onClick={() => setShowShortcuts(!showShortcuts)}
        >
          <Keyboard size={18} />
          <span>Phím tắt</span>
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
