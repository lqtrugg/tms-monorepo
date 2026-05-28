import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportDir = path.join(root, 'report', 'functional-requirements');
const pumlDir = path.join(reportDir, 'puml');
const imageDir = path.join(reportDir, 'diagrams');

fs.rmSync(pumlDir, { recursive: true, force: true });
fs.rmSync(imageDir, { recursive: true, force: true });
fs.mkdirSync(pumlDir, { recursive: true });
fs.mkdirSync(imageDir, { recursive: true });

const useCases = [
  {
    id: 'dang-nhap',
    title: 'Đăng nhập',
    actor: 'Giáo viên, Quản trị viên',
    summary: 'Cho phép người dùng hợp lệ truy cập hệ thống theo đúng vai trò được cấp.',
    preconditions: ['Người dùng có tài khoản trong hệ thống.', 'Hệ thống đang kết nối được với cơ sở dữ liệu.'],
    main: [
      'Người dùng mở màn hình đăng nhập.',
      'Người dùng nhập tên đăng nhập và mật khẩu.',
      'Hệ thống kiểm tra thông tin đăng nhập.',
      'Hệ thống kiểm tra trạng thái và vai trò tài khoản.',
      'Hệ thống cấp phiên đăng nhập và chuyển người dùng vào màn hình chính.',
    ],
    alt: [
      'Nếu thiếu thông tin đăng nhập, hệ thống yêu cầu nhập đầy đủ.',
      'Nếu thông tin đăng nhập không chính xác, hệ thống thông báo lỗi.',
      'Nếu tài khoản không còn hoạt động, hệ thống từ chối đăng nhập.',
    ],
    postconditions: ['Người dùng đăng nhập thành công và sử dụng được các chức năng theo quyền hạn.'],
    dfdProcess: 'Xác thực đăng nhập',
    dfdInputs: ['Tên đăng nhập', 'Mật khẩu'],
    dfdStore: 'Tài khoản giáo viên',
    dfdOutputs: ['Phiên đăng nhập', 'Thông tin người dùng', 'Thông báo lỗi'],
    extra: ['sequence'],
  },
  {
    id: 'xem-tong-quan',
    title: 'Xem tổng quan giảng dạy',
    actor: 'Giáo viên',
    summary: 'Cung cấp số liệu tổng quan về lớp học, học sinh, buổi học và tình hình tài chính.',
    preconditions: ['Giáo viên đã đăng nhập.'],
    main: [
      'Giáo viên truy cập màn hình tổng quan.',
      'Hệ thống tổng hợp dữ liệu lớp học, học sinh, buổi học và tài chính.',
      'Hệ thống hiển thị các chỉ số tổng quan cho giáo viên.',
    ],
    alt: ['Nếu không có dữ liệu, hệ thống hiển thị trạng thái trống phù hợp.'],
    postconditions: ['Giáo viên nắm được tình hình vận hành hiện tại.'],
    dfdProcess: 'Tổng hợp dữ liệu giảng dạy',
    dfdInputs: ['Yêu cầu xem tổng quan'],
    dfdStore: 'Lớp học, học sinh, buổi học, tài chính',
    dfdOutputs: ['Chỉ số tổng quan', 'Danh sách nhắc việc'],
    extra: [],
  },
  {
    id: 'cap-nhat-ho-so',
    title: 'Cập nhật hồ sơ cá nhân',
    actor: 'Giáo viên',
    summary: 'Cho phép giáo viên cập nhật thông tin hồ sơ cá nhân trong hệ thống.',
    preconditions: ['Giáo viên đã đăng nhập.'],
    main: [
      'Giáo viên mở màn hình hồ sơ cá nhân.',
      'Giáo viên chỉnh sửa thông tin cần thay đổi.',
      'Hệ thống kiểm tra dữ liệu nhập.',
      'Hệ thống lưu thông tin hồ sơ mới.',
      'Hệ thống hiển thị hồ sơ đã cập nhật.',
    ],
    alt: ['Nếu dữ liệu không hợp lệ, hệ thống hiển thị lỗi và không lưu thay đổi.'],
    postconditions: ['Thông tin hồ sơ cá nhân của giáo viên được cập nhật.'],
    dfdProcess: 'Cập nhật hồ sơ cá nhân',
    dfdInputs: ['Thông tin hồ sơ mới'],
    dfdStore: 'Hồ sơ giáo viên',
    dfdOutputs: ['Hồ sơ đã cập nhật', 'Thông báo lỗi'],
    extra: [],
  },
  {
    id: 'lien-ket-discord',
    title: 'Liên kết tài khoản Discord',
    actor: 'Giáo viên, Discord',
    summary: 'Liên kết tài khoản Discord của giáo viên để hệ thống có thể sử dụng các chức năng Discord liên quan đến lớp học.',
    preconditions: ['Giáo viên đã đăng nhập.', 'Bot Discord đã được cấu hình.'],
    main: [
      'Giáo viên chọn liên kết Discord.',
      'Hệ thống chuyển giáo viên sang trang xác thực Discord.',
      'Giáo viên xác nhận quyền truy cập.',
      'Discord trả kết quả xác thực về hệ thống.',
      'Hệ thống lưu định danh Discord của giáo viên.',
    ],
    alt: [
      'Nếu giáo viên hủy xác thực, hệ thống ghi nhận trạng thái hủy.',
      'Nếu Discord trả lỗi hoặc state không hợp lệ, hệ thống thông báo liên kết thất bại.',
    ],
    postconditions: ['Tài khoản giáo viên có thông tin Discord đã xác thực.'],
    dfdProcess: 'Liên kết Discord giáo viên',
    dfdInputs: ['Yêu cầu liên kết', 'Mã xác thực Discord'],
    dfdStore: 'Hồ sơ giáo viên, cấu hình Discord',
    dfdOutputs: ['Trạng thái liên kết Discord'],
    extra: ['sequence'],
  },
  {
    id: 'quan-ly-hoc-sinh',
    title: 'Quản lý học sinh',
    actor: 'Giáo viên',
    summary: 'Cho phép giáo viên tạo, cập nhật và tra cứu hồ sơ học sinh.',
    preconditions: ['Giáo viên đã đăng nhập.', 'Lớp học cần ghi danh đang hoạt động.'],
    main: [
      'Giáo viên nhập hoặc chỉnh sửa thông tin học sinh.',
      'Hệ thống kiểm tra tên, lớp học và handle Codeforces.',
      'Hệ thống lưu hồ sơ học sinh.',
      'Khi tạo mới, hệ thống tạo ghi danh học sinh vào lớp.',
      'Hệ thống hiển thị hồ sơ học sinh sau khi lưu.',
    ],
    alt: [
      'Nếu lớp học không tồn tại hoặc đã lưu trữ, hệ thống từ chối thao tác.',
      'Nếu handle Codeforces bị trùng, hệ thống yêu cầu nhập handle khác.',
    ],
    postconditions: ['Hồ sơ học sinh được tạo hoặc cập nhật đúng dữ liệu.'],
    dfdProcess: 'Quản lý hồ sơ học sinh',
    dfdInputs: ['Thông tin học sinh', 'Thông tin lớp ghi danh'],
    dfdStore: 'Học sinh, ghi danh, lớp học',
    dfdOutputs: ['Hồ sơ học sinh', 'Thông báo lỗi'],
    extra: ['activity'],
  },
  {
    id: 'quan-ly-ghi-danh',
    title: 'Quản lý ghi danh học sinh',
    actor: 'Giáo viên',
    summary: 'Quản lý việc chuyển lớp, nghỉ học, lưu trữ và học lại của học sinh.',
    preconditions: ['Giáo viên đã đăng nhập.', 'Học sinh đã tồn tại trong hệ thống.'],
    main: [
      'Giáo viên chọn học sinh và thao tác ghi danh cần thực hiện.',
      'Hệ thống kiểm tra trạng thái hiện tại của học sinh.',
      'Hệ thống kiểm tra lớp đích hoặc thời điểm thay đổi.',
      'Hệ thống kết thúc ghi danh cũ nếu cần.',
      'Hệ thống tạo ghi danh mới hoặc cập nhật trạng thái học sinh.',
      'Hệ thống hiển thị trạng thái học sinh sau thao tác.',
    ],
    alt: [
      'Nếu chuyển về chính lớp hiện tại, hệ thống từ chối thao tác.',
      'Nếu thời điểm thay đổi không hợp lệ, hệ thống thông báo lỗi.',
      'Nếu học sinh còn công nợ khi nghỉ học, hệ thống chuyển sang trạng thái chờ lưu trữ.',
    ],
    postconditions: ['Trạng thái học sinh và lịch sử ghi danh được cập nhật nhất quán.'],
    dfdProcess: 'Xử lý ghi danh học sinh',
    dfdInputs: ['Yêu cầu chuyển lớp/nghỉ học/học lại', 'Thời điểm thay đổi'],
    dfdStore: 'Học sinh, ghi danh, lớp học, công nợ',
    dfdOutputs: ['Trạng thái học sinh', 'Lịch sử ghi danh'],
    extra: ['sequence', 'activity', 'collaboration'],
  },
  {
    id: 'xu-ly-cho-luu-tru',
    title: 'Xử lý học sinh chờ lưu trữ',
    actor: 'Giáo viên',
    summary: 'Hoàn tất lưu trữ học sinh sau khi các khoản phải thu hoặc hoàn trả đã được xử lý.',
    preconditions: ['Học sinh đang ở trạng thái chờ lưu trữ.'],
    main: [
      'Giáo viên mở danh sách học sinh chờ lưu trữ.',
      'Giáo viên chọn học sinh cần lưu trữ.',
      'Hệ thống kiểm tra số dư công nợ của học sinh.',
      'Nếu số dư bằng 0, hệ thống lưu trữ học sinh.',
      'Hệ thống cập nhật danh sách chờ lưu trữ.',
    ],
    alt: ['Nếu số dư khác 0, hệ thống yêu cầu xử lý tài chính trước khi lưu trữ.'],
    postconditions: ['Học sinh được lưu trữ khi đủ điều kiện.'],
    dfdProcess: 'Lưu trữ học sinh chờ xử lý',
    dfdInputs: ['Yêu cầu lưu trữ học sinh'],
    dfdStore: 'Học sinh, ghi danh, công nợ',
    dfdOutputs: ['Trạng thái lưu trữ', 'Thông báo cần xử lý tài chính'],
    extra: ['activity'],
  },
  {
    id: 'quan-ly-lop-hoc',
    title: 'Quản lý lớp học',
    actor: 'Giáo viên',
    summary: 'Cho phép giáo viên tạo, cập nhật và lưu trữ lớp học.',
    preconditions: ['Giáo viên đã đăng nhập.'],
    main: [
      'Giáo viên nhập thông tin lớp học.',
      'Hệ thống kiểm tra tên lớp, học phí và lịch học.',
      'Hệ thống lưu thông tin lớp học.',
      'Hệ thống lưu lịch học định kỳ kèm theo nếu có.',
      'Hệ thống hiển thị lớp học đã cập nhật.',
    ],
    alt: ['Nếu tên lớp, học phí hoặc lịch học không hợp lệ, hệ thống thông báo lỗi.'],
    postconditions: ['Thông tin lớp học được lưu đúng trạng thái.'],
    dfdProcess: 'Quản lý lớp học',
    dfdInputs: ['Thông tin lớp học', 'Lịch học định kỳ'],
    dfdStore: 'Lớp học, lịch học',
    dfdOutputs: ['Thông tin lớp học đã lưu'],
    extra: ['sequence'],
  },
  {
    id: 'quan-ly-lich-hoc',
    title: 'Quản lý lịch học định kỳ',
    actor: 'Giáo viên',
    summary: 'Quản lý các khung giờ học định kỳ của một lớp.',
    preconditions: ['Lớp học tồn tại và đang hoạt động.'],
    main: [
      'Giáo viên mở thông tin lịch học của lớp.',
      'Giáo viên thêm, sửa hoặc thay thế lịch định kỳ.',
      'Hệ thống lưu lịch học mới.',
      'Hệ thống hiển thị danh sách lịch học đã cập nhật.',
    ],
    alt: ['Nếu lịch học không hợp lệ, hệ thống yêu cầu chỉnh sửa lại.'],
    postconditions: ['Lịch học định kỳ của lớp được cập nhật.'],
    dfdProcess: 'Cập nhật lịch học định kỳ',
    dfdInputs: ['Danh sách lịch học'],
    dfdStore: 'Lớp học, lịch học',
    dfdOutputs: ['Lịch học đã cập nhật'],
    extra: [],
  },
  {
    id: 'quan-ly-buoi-hoc',
    title: 'Quản lý buổi học',
    actor: 'Giáo viên',
    summary: 'Cho phép giáo viên xem, tạo thủ công và hủy buổi học.',
    preconditions: ['Giáo viên đã đăng nhập.', 'Lớp học đang hoạt động.'],
    main: [
      'Giáo viên mở danh sách buổi học.',
      'Giáo viên tạo buổi học thủ công hoặc chọn hủy buổi học.',
      'Hệ thống kiểm tra lớp, thời gian, trùng lịch và giao nhau.',
      'Hệ thống lưu buổi học hoặc cập nhật trạng thái hủy.',
      'Hệ thống hiển thị danh sách buổi học mới.',
    ],
    alt: [
      'Nếu thời gian nằm trong quá khứ, hệ thống từ chối tạo buổi học.',
      'Nếu buổi học bị trùng hoặc giao nhau, hệ thống thông báo lỗi.',
    ],
    postconditions: ['Buổi học được tạo hoặc hủy theo đúng quy tắc.'],
    dfdProcess: 'Quản lý buổi học',
    dfdInputs: ['Thông tin buổi học', 'Yêu cầu hủy buổi học'],
    dfdStore: 'Lớp học, buổi học',
    dfdOutputs: ['Danh sách buổi học', 'Trạng thái buổi học'],
    extra: ['activity'],
  },
  {
    id: 'diem-danh-buoi-hoc',
    title: 'Điểm danh buổi học',
    actor: 'Giáo viên, Discord',
    summary: 'Ghi nhận tình trạng tham gia buổi học của học sinh và đồng bộ khoản học phí phát sinh.',
    preconditions: ['Buổi học tồn tại và chưa bị hủy.', 'Học sinh có ghi danh hợp lệ tại thời điểm buổi học.'],
    main: [
      'Giáo viên mở chi tiết điểm danh của buổi học.',
      'Hệ thống hiển thị danh sách học sinh thuộc lớp tại thời điểm buổi học.',
      'Giáo viên cập nhật trạng thái điểm danh.',
      'Hệ thống kiểm tra học sinh còn ghi danh hợp lệ.',
      'Hệ thống lưu bản ghi điểm danh.',
      'Hệ thống tạo, kích hoạt hoặc hủy khoản học phí tương ứng.',
    ],
    alt: [
      'Nếu buổi học đã hủy, hệ thống không cho cập nhật điểm danh.',
      'Nếu học sinh không thuộc lớp tại thời điểm buổi học, hệ thống từ chối cập nhật.',
      'Nếu có dữ liệu voice từ Discord, hệ thống có thể tự ghi nhận điểm danh trước khi giáo viên ghi đè thủ công.',
    ],
    postconditions: ['Điểm danh và khoản học phí phát sinh được cập nhật nhất quán.'],
    dfdProcess: 'Cập nhật điểm danh',
    dfdInputs: ['Trạng thái điểm danh', 'Trạng thái voice Discord'],
    dfdStore: 'Buổi học, học sinh, ghi danh, điểm danh, học phí',
    dfdOutputs: ['Danh sách điểm danh', 'Khoản học phí phát sinh'],
    extra: ['sequence', 'activity', 'collaboration'],
  },
  {
    id: 'theo-doi-ket-qua',
    title: 'Theo dõi kết quả học tập',
    actor: 'Giáo viên',
    summary: 'Cho phép giáo viên xem hồ sơ học tập và tiến độ của học sinh.',
    preconditions: ['Giáo viên đã đăng nhập.', 'Học sinh tồn tại trong hệ thống.'],
    main: [
      'Giáo viên mở hồ sơ học tập của học sinh.',
      'Hệ thống tổng hợp ghi danh, điểm danh, tài chính và kết quả liên quan.',
      'Hệ thống hiển thị hồ sơ học tập cho giáo viên.',
    ],
    alt: ['Nếu học sinh không tồn tại, hệ thống thông báo không tìm thấy dữ liệu.'],
    postconditions: ['Giáo viên xem được thông tin học tập tổng hợp của học sinh.'],
    dfdProcess: 'Tổng hợp hồ sơ học tập',
    dfdInputs: ['Yêu cầu xem hồ sơ học sinh'],
    dfdStore: 'Học sinh, ghi danh, điểm danh, tài chính, standing',
    dfdOutputs: ['Hồ sơ học tập'],
    extra: [],
  },
  {
    id: 'quan-ly-giao-dich',
    title: 'Quản lý giao dịch tài chính',
    actor: 'Giáo viên',
    summary: 'Ghi nhận các giao dịch thu tiền, hoàn trả và cập nhật trạng thái khoản học phí.',
    preconditions: ['Giáo viên đã đăng nhập.', 'Học sinh liên quan tồn tại trong hệ thống.'],
    main: [
      'Giáo viên nhập giao dịch tài chính.',
      'Hệ thống kiểm tra học sinh, số tiền, loại giao dịch và ngày ghi nhận.',
      'Hệ thống lưu giao dịch.',
      'Giáo viên có thể cập nhật trạng thái khoản học phí phát sinh.',
      'Hệ thống hiển thị danh sách giao dịch mới.',
    ],
    alt: ['Nếu số tiền hoặc học sinh không hợp lệ, hệ thống thông báo lỗi.'],
    postconditions: ['Dữ liệu giao dịch và trạng thái khoản học phí được cập nhật.'],
    dfdProcess: 'Ghi nhận giao dịch tài chính',
    dfdInputs: ['Thông tin giao dịch', 'Trạng thái khoản học phí'],
    dfdStore: 'Giao dịch, khoản học phí, học sinh',
    dfdOutputs: ['Danh sách giao dịch', 'Số dư học sinh'],
    extra: ['activity'],
  },
  {
    id: 'xem-bao-cao-tai-chinh',
    title: 'Xem báo cáo tài chính',
    actor: 'Giáo viên',
    summary: 'Cung cấp báo cáo thu chi, công nợ và số dư học sinh.',
    preconditions: ['Giáo viên đã đăng nhập.'],
    main: [
      'Giáo viên mở màn hình báo cáo tài chính.',
      'Giáo viên chọn bộ lọc thời gian hoặc lớp học.',
      'Hệ thống tổng hợp giao dịch, khoản học phí và số dư.',
      'Hệ thống hiển thị báo cáo tài chính.',
    ],
    alt: ['Nếu không có dữ liệu, hệ thống hiển thị báo cáo rỗng.'],
    postconditions: ['Giáo viên xem được tình hình tài chính theo bộ lọc.'],
    dfdProcess: 'Tổng hợp báo cáo tài chính',
    dfdInputs: ['Bộ lọc báo cáo'],
    dfdStore: 'Giao dịch, khoản học phí, học sinh, lớp học',
    dfdOutputs: ['Báo cáo tài chính', 'Số dư học sinh'],
    extra: [],
  },
  {
    id: 'thiet-lap-discord-lop',
    title: 'Thiết lập Discord cho lớp học',
    actor: 'Giáo viên, Discord',
    summary: 'Gắn Discord Guild và các kênh cần thiết với một lớp học.',
    preconditions: ['Giáo viên đã liên kết Discord.', 'Bot Discord đã được cài vào guild cần sử dụng.'],
    main: [
      'Giáo viên mở phần thiết lập Discord của lớp.',
      'Hệ thống lấy danh sách guild và channel từ dữ liệu Discord đã đồng bộ.',
      'Giáo viên chọn guild, kênh thông báo và kênh voice điểm danh.',
      'Hệ thống kiểm tra guild chưa bị gắn cho lớp khác.',
      'Hệ thống kiểm tra đúng loại kênh text/voice.',
      'Hệ thống lưu thiết lập Discord cho lớp.',
    ],
    alt: [
      'Nếu guild đã được gắn với lớp khác, hệ thống từ chối.',
      'Nếu chọn sai loại kênh, hệ thống yêu cầu chọn lại.',
    ],
    postconditions: ['Lớp học có cấu hình Discord hợp lệ.'],
    dfdProcess: 'Thiết lập Discord lớp học',
    dfdInputs: ['Guild đã chọn', 'Kênh thông báo', 'Kênh voice'],
    dfdStore: 'Discord guild/channel, thiết lập Discord lớp',
    dfdOutputs: ['Cấu hình Discord lớp học'],
    extra: ['sequence', 'activity'],
  },
  {
    id: 'gui-thong-bao',
    title: 'Gửi thông báo cho học sinh',
    actor: 'Giáo viên, Discord',
    summary: 'Gửi thông báo đến học sinh hoặc lớp thông qua Discord.',
    preconditions: ['Giáo viên đã đăng nhập.', 'Lớp hoặc học sinh nhận thông báo có cấu hình Discord phù hợp.'],
    main: [
      'Giáo viên nhập nội dung thông báo và chọn người nhận.',
      'Hệ thống xác định danh sách người nhận hoặc kênh nhận.',
      'Hệ thống kiểm tra cấu hình Discord liên quan.',
      'Hệ thống gửi thông báo qua Discord.',
      'Hệ thống trả kết quả gửi thành công/thất bại cho từng đích.',
    ],
    alt: [
      'Nếu học sinh chưa có Discord hoặc lớp chưa cấu hình guild, hệ thống ghi nhận gửi thất bại cho đích đó.',
      'Nếu Discord trả lỗi, hệ thống hiển thị chi tiết lỗi tương ứng.',
    ],
    postconditions: ['Thông báo được gửi đến các đích hợp lệ và kết quả gửi được hiển thị.'],
    dfdProcess: 'Gửi thông báo',
    dfdInputs: ['Nội dung thông báo', 'Danh sách người nhận'],
    dfdStore: 'Học sinh, thiết lập Discord lớp, định danh Discord',
    dfdOutputs: ['Tin nhắn Discord', 'Kết quả gửi'],
    extra: ['activity'],
  },
  {
    id: 'gan-gym-codeforces',
    title: 'Gắn Gym Codeforces cho lớp học',
    actor: 'Giáo viên, Codeforces',
    summary: 'Gắn một Gym Codeforces đã đồng bộ vào lớp học để theo dõi bài tập và standing.',
    preconditions: ['Lớp học đang hoạt động.', 'Gym đã được đồng bộ từ Codeforces.'],
    main: [
      'Giáo viên mở danh sách Gym có thể gắn.',
      'Giáo viên chọn Gym cần gắn cho lớp.',
      'Hệ thống kiểm tra lớp học và Gym đã đồng bộ.',
      'Hệ thống tạo Gym gắn với lớp.',
      'Hệ thống hiển thị Gym trong lớp học.',
    ],
    alt: [
      'Nếu lớp đã lưu trữ, hệ thống từ chối thao tác.',
      'Nếu Gym chưa được đồng bộ, hệ thống thông báo không tìm thấy Gym.',
    ],
    postconditions: ['Lớp học có Gym Codeforces để theo dõi standing.'],
    dfdProcess: 'Gắn Gym Codeforces',
    dfdInputs: ['Gym được chọn', 'Lớp học'],
    dfdStore: 'Gym Codeforces, lớp học',
    dfdOutputs: ['Gym đã gắn với lớp'],
    extra: ['sequence'],
  },
  {
    id: 'xem-bang-xep-hang',
    title: 'Xem bảng xếp hạng Gym',
    actor: 'Giáo viên, Codeforces',
    summary: 'Hiển thị standing của học sinh trong một Gym Codeforces đã gắn với lớp.',
    preconditions: ['Lớp học đã gắn Gym Codeforces.', 'Dữ liệu standing đã được đồng bộ.'],
    main: [
      'Giáo viên mở bảng xếp hạng Gym của lớp.',
      'Hệ thống đọc dữ liệu bài tập và standing đã đồng bộ.',
      'Hệ thống ghép standing với danh sách học sinh của lớp.',
      'Hệ thống hiển thị ma trận kết quả.',
    ],
    alt: ['Nếu chưa có dữ liệu standing, hệ thống hiển thị trạng thái chưa có dữ liệu.'],
    postconditions: ['Giáo viên xem được kết quả làm bài của học sinh trong Gym.'],
    dfdProcess: 'Tổng hợp bảng xếp hạng Gym',
    dfdInputs: ['Yêu cầu xem standing'],
    dfdStore: 'Gym, bài tập, standing, học sinh',
    dfdOutputs: ['Bảng xếp hạng Gym'],
    extra: [],
  },
  {
    id: 'quan-ly-tai-khoan-giao-vien',
    title: 'Quản lý tài khoản giáo viên',
    actor: 'Quản trị viên',
    summary: 'Cho phép quản trị viên xem và cập nhật tài khoản giáo viên.',
    preconditions: ['Quản trị viên đã đăng nhập.'],
    main: [
      'Quản trị viên mở danh sách tài khoản giáo viên.',
      'Hệ thống hiển thị danh sách tài khoản.',
      'Quản trị viên cập nhật thông tin hoặc trạng thái tài khoản.',
      'Hệ thống lưu thay đổi.',
      'Hệ thống hiển thị tài khoản đã cập nhật.',
    ],
    alt: ['Nếu tài khoản không tồn tại, hệ thống thông báo lỗi.'],
    postconditions: ['Tài khoản giáo viên được cập nhật theo thao tác quản trị.'],
    dfdProcess: 'Quản lý tài khoản giáo viên',
    dfdInputs: ['Thông tin tài khoản cần cập nhật'],
    dfdStore: 'Tài khoản giáo viên',
    dfdOutputs: ['Danh sách tài khoản', 'Tài khoản đã cập nhật'],
    extra: [],
  },
  {
    id: 'cau-hinh-bot-discord',
    title: 'Cấu hình bot Discord',
    actor: 'Quản trị viên',
    summary: 'Lưu cấu hình bot Discord để hệ thống sử dụng cho các chức năng Discord.',
    preconditions: ['Quản trị viên đã đăng nhập.', 'Thông tin bot Discord hợp lệ đã được chuẩn bị.'],
    main: [
      'Quản trị viên mở màn hình cấu hình Discord.',
      'Quản trị viên nhập bot token, client id, client secret và quyền cần dùng.',
      'Hệ thống kiểm tra dữ liệu cấu hình.',
      'Hệ thống lưu cấu hình bot Discord.',
      'Hệ thống hiển thị trạng thái cấu hình.',
    ],
    alt: ['Nếu thiếu thông tin bắt buộc, hệ thống yêu cầu nhập đầy đủ.'],
    postconditions: ['Bot Discord được cấu hình để phục vụ các luồng Discord của hệ thống.'],
    dfdProcess: 'Cấu hình bot Discord',
    dfdInputs: ['Bot token', 'Client id', 'Client secret', 'Quyền bot'],
    dfdStore: 'Cấu hình bot Discord',
    dfdOutputs: ['Trạng thái cấu hình bot'],
    extra: [],
  },
  {
    id: 'uy-quyen-discord-guild',
    title: 'Uỷ quyền quản lý Discord Guild',
    actor: 'Học sinh, Discord',
    summary: 'Học sinh ủy quyền Discord để hệ thống có thể quản lý tư cách thành viên Discord Guild của lớp.',
    preconditions: ['Học sinh tồn tại trong hệ thống.', 'Bot Discord đã được cấu hình.'],
    main: [
      'Học sinh mở đường dẫn ủy quyền Discord.',
      'Hệ thống chuyển học sinh sang trang Discord OAuth.',
      'Học sinh đồng ý cấp quyền identify và guilds.join.',
      'Discord trả mã xác thực về hệ thống.',
      'Hệ thống đổi mã lấy token và lấy thông tin Discord của học sinh.',
      'Hệ thống lưu định danh và token Discord của học sinh.',
    ],
    alt: [
      'Nếu học sinh hủy ủy quyền, hệ thống ghi nhận trạng thái hủy.',
      'Nếu callback thiếu thông tin hoặc state không hợp lệ, hệ thống từ chối xử lý.',
    ],
    postconditions: ['Hệ thống có thông tin Discord cần thiết để thêm học sinh vào Guild lớp.'],
    dfdProcess: 'Uỷ quyền Discord học sinh',
    dfdInputs: ['Yêu cầu ủy quyền', 'Mã xác thực Discord'],
    dfdStore: 'Học sinh, định danh Discord học sinh',
    dfdOutputs: ['Trạng thái ủy quyền', 'Quyền thêm vào Guild lớp'],
    extra: ['sequence', 'activity'],
  },
];

function lines(items) {
  return items.map((item) => `    \\item ${escapeLatex(item)}`).join('\n');
}

function escapeLatex(value) {
  return String(value)
    .replaceAll('\\', '\\textbackslash{}')
    .replaceAll('&', '\\&')
    .replaceAll('%', '\\%')
    .replaceAll('$', '\\$')
    .replaceAll('#', '\\#')
    .replaceAll('_', '\\_')
    .replaceAll('{', '\\{')
    .replaceAll('}', '\\}')
    .replaceAll('~', '\\textasciitilde{}')
    .replaceAll('^', '\\textasciicircum{}');
}

function pumlEscape(value) {
  return String(value).replaceAll('"', '\\"');
}

function writePuml(name, content) {
  fs.writeFileSync(path.join(pumlDir, `${name}.puml`), `${content.trim()}\n`, 'utf8');
}

writePuml('use-case-overview', `
@startuml
left to right direction
skinparam packageStyle rectangle
actor "Giáo viên" as Teacher
actor "Quản trị viên" as Admin
actor "Học sinh" as Student
actor "Discord" as Discord
actor "Codeforces" as Codeforces
rectangle "Hệ thống TMS" {
${useCases.map((uc, index) => `  usecase "${pumlEscape(uc.title)}" as UC${index + 1}`).join('\n')}
}
Teacher --> UC1
Teacher --> UC2
Teacher --> UC3
Teacher --> UC4
Teacher --> UC5
Teacher --> UC6
Teacher --> UC7
Teacher --> UC8
Teacher --> UC9
Teacher --> UC10
Teacher --> UC11
Teacher --> UC12
Teacher --> UC13
Teacher --> UC14
Teacher --> UC15
Teacher --> UC16
Teacher --> UC17
Teacher --> UC18
Admin --> UC1
Admin --> UC19
Admin --> UC20
Student --> UC21
Discord --> UC4
Discord --> UC11
Discord --> UC15
Discord --> UC16
Discord --> UC21
Codeforces --> UC17
Codeforces --> UC18
@enduml
`);

for (const uc of useCases) {
  writePuml(`dfd-${uc.id}`, `
@startuml
left to right direction
skinparam rectangle {
  RoundCorner 8
}
actor "${pumlEscape(uc.actor)}" as Actor
rectangle "${pumlEscape(uc.dfdProcess)}" as Process
database "${pumlEscape(uc.dfdStore)}" as Store
Actor --> Process : ${pumlEscape(uc.dfdInputs.join('\\n'))}
Process --> Store : Dữ liệu cần lưu/tra cứu
Store --> Process : Dữ liệu nghiệp vụ
Process --> Actor : ${pumlEscape(uc.dfdOutputs.join('\\n'))}
@enduml
`);
}

const activityDiagrams = {
  'dang-nhap': `
@startuml
start
:Mở màn hình đăng nhập;
:Nhập tên đăng nhập và mật khẩu;
if (Đã nhập đủ thông tin?) then (Không)
  :Thông báo yêu cầu nhập đầy đủ;
  stop
else (Có)
  :Kiểm tra tài khoản;
endif
if (Thông tin đăng nhập đúng?) then (Không)
  :Thông báo sai thông tin đăng nhập;
  stop
else (Có)
  :Kiểm tra trạng thái tài khoản;
endif
if (Tài khoản đang hoạt động?) then (Không)
  :Thông báo tài khoản bị vô hiệu hóa;
  stop
else (Có)
  :Xác định vai trò và quyền sử dụng;
  :Tạo phiên đăng nhập;
  :Chuyển vào màn hình chính;
endif
stop
@enduml`,
  'xem-tong-quan': `
@startuml
start
:Giáo viên mở màn hình tổng quan;
:Lấy dữ liệu lớp học;
:Lấy dữ liệu học sinh;
:Lấy dữ liệu buổi học;
:Lấy dữ liệu tài chính;
if (Có dữ liệu tổng quan?) then (Không)
  :Hiển thị trạng thái trống;
else (Có)
  :Tính các chỉ số tổng quan;
  :Hiển thị nhắc việc và số liệu;
endif
stop
@enduml`,
  'cap-nhat-ho-so': `
@startuml
start
:Giáo viên mở hồ sơ cá nhân;
:Chỉnh sửa thông tin hồ sơ;
:Gửi yêu cầu cập nhật;
if (Dữ liệu hợp lệ?) then (Không)
  :Hiển thị lỗi nhập liệu;
  stop
else (Có)
  :Lưu thông tin hồ sơ mới;
  :Hiển thị hồ sơ đã cập nhật;
endif
stop
@enduml`,
  'lien-ket-discord': `
@startuml
start
:Giáo viên chọn liên kết Discord;
:Tạo yêu cầu xác thực Discord;
:Chuyển sang Discord OAuth;
if (Giáo viên đồng ý cấp quyền?) then (Không)
  :Ghi nhận hủy liên kết;
  stop
else (Có)
  :Discord trả mã xác thực;
endif
if (Mã xác thực và state hợp lệ?) then (Không)
  :Thông báo liên kết thất bại;
  stop
else (Có)
  :Đổi mã lấy thông tin Discord;
  :Lưu định danh Discord của giáo viên;
  :Thông báo liên kết thành công;
endif
stop
@enduml`,
  'quan-ly-hoc-sinh': `
@startuml
start
:Giáo viên nhập thông tin học sinh;
if (Lớp ghi danh hợp lệ?) then (Không)
  :Thông báo lớp không hợp lệ;
  stop
else (Có)
  :Kiểm tra thông tin học sinh;
endif
if (Handle Codeforces bị trùng?) then (Có)
  :Yêu cầu nhập handle khác;
  stop
else (Không)
  :Lưu hồ sơ học sinh;
endif
if (Tạo học sinh mới?) then (Có)
  :Tạo ghi danh ban đầu;
else (Không)
  :Giữ lịch sử ghi danh hiện có;
endif
:Hiển thị hồ sơ học sinh;
stop
@enduml`,
  'quan-ly-ghi-danh': `
@startuml
start
:Giáo viên chọn học sinh;
:Chọn thao tác ghi danh;
if (Thao tác?) then (Chuyển lớp)
  :Kiểm tra lớp đích;
  if (Lớp đích là lớp hiện tại?) then (Có)
    :Từ chối chuyển lớp;
    stop
  else (Không)
    :Kết thúc ghi danh cũ;
    :Tạo ghi danh mới;
    :Cập nhật lớp hiện tại của học sinh;
  endif
elseif (Nghỉ học)
  :Kiểm tra thời điểm nghỉ học;
  if (Thời điểm hợp lệ?) then (Không)
    :Thông báo lỗi thời điểm;
    stop
  else (Có)
    :Kết thúc ghi danh hiện tại;
  endif
  if (Còn công nợ?) then (Có)
    :Chuyển học sinh sang chờ lưu trữ;
  else (Không)
    :Lưu trữ học sinh;
  endif
else (Học lại)
  if (Học sinh đã lưu trữ?) then (Không)
    :Từ chối học lại;
    stop
  else (Có)
    :Tạo ghi danh mới;
    :Chuyển học sinh sang đang học;
  endif
endif
:Hiển thị trạng thái học sinh sau thao tác;
stop
@enduml`,
  'xu-ly-cho-luu-tru': `
@startuml
start
:Giáo viên mở danh sách chờ lưu trữ;
:Chọn học sinh cần lưu trữ;
:Kiểm tra số dư công nợ;
if (Số dư bằng 0?) then (Không)
  :Yêu cầu xử lý tài chính trước;
  stop
else (Có)
  :Lưu trữ học sinh;
  :Cập nhật danh sách chờ lưu trữ;
endif
stop
@enduml`,
  'quan-ly-lop-hoc': `
@startuml
start
:Giáo viên nhập thông tin lớp học;
:Nhập học phí và lịch học định kỳ;
if (Thông tin lớp hợp lệ?) then (Không)
  :Thông báo lỗi thông tin lớp;
  stop
else (Có)
  :Lưu thông tin lớp học;
endif
if (Có lịch học định kỳ?) then (Có)
  :Lưu danh sách lịch học;
else (Không)
  :Bỏ qua lưu lịch học;
endif
:Hiển thị lớp học đã cập nhật;
stop
@enduml`,
  'quan-ly-lich-hoc': `
@startuml
start
:Giáo viên mở lịch học của lớp;
:Thêm, sửa hoặc thay thế lịch định kỳ;
if (Lịch học hợp lệ?) then (Không)
  :Yêu cầu chỉnh sửa lịch;
  stop
else (Có)
  :Lưu lịch học mới;
  :Hiển thị danh sách lịch học đã cập nhật;
endif
stop
@enduml`,
  'quan-ly-buoi-hoc': `
@startuml
start
:Giáo viên mở danh sách buổi học;
if (Thao tác?) then (Tạo buổi học)
  :Nhập thời gian buổi học;
  if (Thời gian trong quá khứ?) then (Có)
    :Từ chối tạo buổi học;
    stop
  else (Không)
    :Kiểm tra trùng hoặc giao lịch;
  endif
  if (Có xung đột lịch?) then (Có)
    :Thông báo lỗi xung đột;
    stop
  else (Không)
    :Tạo buổi học thủ công;
  endif
else (Hủy buổi học)
  :Chọn buổi học cần hủy;
  :Cập nhật trạng thái đã hủy;
endif
:Hiển thị danh sách buổi học mới;
stop
@enduml`,
  'diem-danh-buoi-hoc': `
@startuml
start
:Giáo viên mở chi tiết buổi học;
if (Buổi học đã hủy?) then (Có)
  :Không cho cập nhật điểm danh;
  stop
else (Không)
  :Hiển thị danh sách học sinh của lớp tại thời điểm học;
endif
if (Có dữ liệu voice Discord?) then (Có)
  :Gợi ý trạng thái điểm danh tự động;
else (Không)
  :Chờ giáo viên cập nhật thủ công;
endif
:Giáo viên chọn học sinh và trạng thái điểm danh;
if (Học sinh có ghi danh hợp lệ?) then (Không)
  :Từ chối cập nhật điểm danh;
  stop
else (Có)
  :Lưu bản ghi điểm danh;
endif
if (Có mặt hoặc vắng không phép?) then (Có)
  :Tạo hoặc kích hoạt khoản học phí;
else (Vắng có phép)
  :Hủy khoản học phí nếu có;
endif
:Hiển thị kết quả điểm danh;
stop
@enduml`,
  'theo-doi-ket-qua': `
@startuml
start
:Giáo viên chọn học sinh;
if (Học sinh tồn tại?) then (Không)
  :Thông báo không tìm thấy dữ liệu;
  stop
else (Có)
  :Lấy hồ sơ học sinh;
endif
:Tổng hợp ghi danh;
:Tổng hợp điểm danh;
:Tổng hợp tài chính;
:Tổng hợp kết quả liên quan;
:Hiển thị hồ sơ học tập;
stop
@enduml`,
  'quan-ly-giao-dich': `
@startuml
start
:Giáo viên nhập giao dịch tài chính;
:Chọn học sinh, loại giao dịch, số tiền và ngày ghi nhận;
if (Dữ liệu giao dịch hợp lệ?) then (Không)
  :Thông báo lỗi giao dịch;
  stop
else (Có)
  :Lưu giao dịch;
endif
if (Có cập nhật khoản học phí?) then (Có)
  :Cập nhật trạng thái khoản học phí;
else (Không)
  :Giữ trạng thái khoản học phí hiện tại;
endif
:Tính lại số dư học sinh;
:Hiển thị danh sách giao dịch mới;
stop
@enduml`,
  'xem-bao-cao-tai-chinh': `
@startuml
start
:Giáo viên mở báo cáo tài chính;
:Chọn bộ lọc thời gian hoặc lớp học;
:Tổng hợp giao dịch;
:Tổng hợp khoản học phí;
:Tính số dư học sinh;
if (Có dữ liệu báo cáo?) then (Không)
  :Hiển thị báo cáo rỗng;
else (Có)
  :Hiển thị báo cáo tài chính;
endif
stop
@enduml`,
  'thiet-lap-discord-lop': `
@startuml
start
:Giáo viên mở thiết lập Discord của lớp;
if (Giáo viên đã liên kết Discord?) then (Không)
  :Yêu cầu liên kết Discord trước;
  stop
else (Có)
  :Lấy danh sách guild và channel;
endif
:Chọn guild, kênh thông báo và kênh voice;
if (Guild đã gắn với lớp khác?) then (Có)
  :Từ chối gắn guild;
  stop
else (Không)
  :Kiểm tra loại kênh;
endif
if (Sai loại kênh text/voice?) then (Có)
  :Yêu cầu chọn lại kênh;
  stop
else (Không)
  :Lưu thiết lập Discord cho lớp;
  :Hiển thị cấu hình đã lưu;
endif
stop
@enduml`,
  'gui-thong-bao': `
@startuml
start
:Giáo viên nhập nội dung thông báo;
:Chọn lớp hoặc học sinh nhận thông báo;
:Xác định danh sách đích gửi;
if (Có đích gửi hợp lệ?) then (Không)
  :Hiển thị không có người nhận hợp lệ;
  stop
else (Có)
  :Kiểm tra cấu hình Discord từng đích;
endif
while (Còn đích cần gửi?) is (Có)
  if (Đích có Discord hợp lệ?) then (Không)
    :Ghi nhận gửi thất bại cho đích đó;
  else (Có)
    :Gửi tin nhắn qua Discord;
    :Ghi nhận kết quả Discord trả về;
  endif
endwhile (Không)
:Hiển thị tổng hợp kết quả gửi;
stop
@enduml`,
  'gan-gym-codeforces': `
@startuml
start
:Giáo viên mở danh sách Gym;
:Chọn Gym cần gắn cho lớp;
if (Lớp đang hoạt động?) then (Không)
  :Từ chối gắn Gym;
  stop
else (Có)
  :Kiểm tra Gym đã đồng bộ;
endif
if (Gym tồn tại?) then (Không)
  :Thông báo không tìm thấy Gym;
  stop
else (Có)
  :Tạo liên kết Gym với lớp;
  :Hiển thị Gym trong lớp học;
endif
stop
@enduml`,
  'xem-bang-xep-hang': `
@startuml
start
:Giáo viên mở bảng xếp hạng Gym;
:Đọc Gym đã gắn với lớp;
if (Có dữ liệu standing?) then (Không)
  :Hiển thị trạng thái chưa có dữ liệu;
  stop
else (Có)
  :Đọc danh sách bài tập và standing;
endif
:Ghép standing với học sinh trong lớp;
:Hiển thị ma trận kết quả;
stop
@enduml`,
  'quan-ly-tai-khoan-giao-vien': `
@startuml
start
:Quản trị viên mở danh sách giáo viên;
:Hiển thị danh sách tài khoản;
:Chọn tài khoản cần cập nhật;
if (Tài khoản tồn tại?) then (Không)
  :Thông báo lỗi tài khoản;
  stop
else (Có)
  :Cập nhật thông tin hoặc trạng thái;
  :Lưu thay đổi;
  :Hiển thị tài khoản đã cập nhật;
endif
stop
@enduml`,
  'cau-hinh-bot-discord': `
@startuml
start
:Quản trị viên mở cấu hình Discord;
:Nhập bot token, client id, client secret và quyền bot;
if (Đã nhập đủ thông tin bắt buộc?) then (Không)
  :Yêu cầu nhập đầy đủ;
  stop
else (Có)
  :Kiểm tra dữ liệu cấu hình;
endif
if (Cấu hình hợp lệ?) then (Không)
  :Thông báo cấu hình không hợp lệ;
  stop
else (Có)
  :Lưu cấu hình bot Discord;
  :Hiển thị trạng thái cấu hình;
endif
stop
@enduml`,
  'uy-quyen-discord-guild': `
@startuml
start
:Học sinh mở đường dẫn ủy quyền Discord;
:Chuyển sang Discord OAuth;
if (Học sinh đồng ý cấp quyền?) then (Không)
  :Ghi nhận hủy ủy quyền;
  stop
else (Có)
  :Discord trả mã xác thực;
endif
if (Callback hợp lệ?) then (Không)
  :Từ chối xử lý callback;
  stop
else (Có)
  :Đổi mã lấy token Discord;
  :Lấy thông tin Discord của học sinh;
  :Lưu định danh và token Discord;
  :Thông báo ủy quyền thành công;
endif
stop
@enduml`,
};

for (const uc of useCases) {
  writePuml(`activity-${uc.id}`, activityDiagrams[uc.id]);
}

writePuml('sequence-dang-nhap', `
@startuml
actor "Người dùng" as User
participant "Giao diện đăng nhập" as UI
participant "Hệ thống" as System
database "Cơ sở dữ liệu" as DB
User -> UI : Nhập tên đăng nhập và mật khẩu
UI -> System : Gửi yêu cầu đăng nhập
System -> DB : Tra cứu tài khoản
DB --> System : Thông tin tài khoản
alt Thông tin không hợp lệ
  System --> UI : Trả lỗi đăng nhập
  UI --> User : Hiển thị thông báo lỗi
else Hợp lệ
  System --> UI : Trả phiên đăng nhập và quyền sử dụng
  UI --> User : Chuyển vào hệ thống
end
@enduml
`);

writePuml('sequence-ghi-danh', `
@startuml
actor "Giáo viên" as Teacher
participant "Hệ thống" as System
database "Học sinh" as StudentStore
database "Ghi danh" as EnrollmentStore
database "Tài chính" as FinanceStore
Teacher -> System : Chọn thao tác ghi danh
System -> StudentStore : Kiểm tra trạng thái học sinh
StudentStore --> System : Trạng thái hiện tại
System -> EnrollmentStore : Kiểm tra ghi danh hiện tại
EnrollmentStore --> System : Ghi danh đang hoạt động
alt Chuyển lớp
  System -> EnrollmentStore : Kết thúc ghi danh cũ
  System -> EnrollmentStore : Tạo ghi danh mới
else Nghỉ học
  System -> FinanceStore : Kiểm tra số dư
  FinanceStore --> System : Số dư học sinh
  System -> StudentStore : Cập nhật trạng thái học sinh
else Học lại
  System -> StudentStore : Kiểm tra điều kiện học lại
  System -> EnrollmentStore : Tạo ghi danh mới
end
System --> Teacher : Trả kết quả cập nhật
@enduml
`);

writePuml('activity-quan-ly-ghi-danh', `
@startuml
start
:Giáo viên chọn học sinh;
:Chọn thao tác ghi danh;
if (Thao tác?) then (Chuyển lớp)
  :Kiểm tra lớp đích;
  :Kết thúc ghi danh cũ;
  :Tạo ghi danh mới;
elseif (Nghỉ học)
  :Kết thúc ghi danh hiện tại;
  if (Còn công nợ?) then (Có)
    :Chuyển sang chờ lưu trữ;
  else (Không)
    :Lưu trữ học sinh;
  endif
else (Học lại)
  :Kiểm tra học sinh đã lưu trữ;
  :Tạo ghi danh mới;
  :Chuyển sang đang học;
endif
:Hiển thị kết quả;
stop
@enduml
`);

writePuml('collaboration-ghi-danh', `
@startuml
skinparam linetype ortho
skinparam object {
  BackgroundColor White
  BorderColor Black
}
object ":Giáo viên" as Teacher
object ":Màn hình học sinh" as Screen
object ":Xử lý ghi danh" as Handler
object ":Học sinh" as Student
object ":Lớp học" as Class
object ":Ghi danh" as Enrollment
object ":Khoản học phí" as Fee

Teacher -down-> Screen : 1: chọn học sinh và thao tác()
Screen -right-> Handler : 1.1: gửi yêu cầu ghi danh()
Handler -down-> Student : 1.1.1: kiểm tra trạng thái()
Student -up-> Handler : 1.1.2: trả trạng thái học sinh()
Handler -right-> Class : 1.2.1: kiểm tra lớp học()
Class -left-> Handler : 1.2.2: trả thông tin lớp()
Handler -down-> Enrollment : 1.3.1: lấy ghi danh hiện tại()
Enrollment -up-> Handler : 1.3.2: trả thông tin ghi danh()
Handler -right-> Fee : 1.4.1: kiểm tra công nợ()
Fee -left-> Handler : 1.4.2: trả số dư học phí()
Handler -down-> Enrollment : 1.5.1: kết thúc hoặc tạo ghi danh()
Handler -down-> Student : 1.5.2: cập nhật trạng thái học sinh()
Handler -left-> Screen : 1.6: trả kết quả xử lý()
Screen -up-> Teacher : 1.7: hiển thị kết quả()
@enduml
`);

writePuml('sequence-diem-danh', `
@startuml
actor "Giáo viên" as Teacher
participant "Hệ thống" as System
database "Buổi học" as SessionStore
database "Ghi danh" as EnrollmentStore
database "Điểm danh" as AttendanceStore
database "Tài chính" as FinanceStore
Teacher -> System : Cập nhật điểm danh
System -> SessionStore : Kiểm tra buổi học
SessionStore --> System : Trạng thái buổi học
System -> EnrollmentStore : Kiểm tra học sinh thuộc lớp tại thời điểm học
EnrollmentStore --> System : Ghi danh hợp lệ
System -> AttendanceStore : Lưu trạng thái điểm danh
System -> FinanceStore : Đồng bộ khoản học phí
FinanceStore --> System : Kết quả đồng bộ
System --> Teacher : Trả bản ghi điểm danh mới
@enduml
`);

writePuml('activity-diem-danh-buoi-hoc', `
@startuml
start
:Giáo viên chọn buổi học;
if (Buổi học đã huỷ?) then (Có)
  :Từ chối cập nhật điểm danh;
  stop
else (Không)
  :Chọn học sinh và trạng thái điểm danh;
endif
if (Học sinh có ghi danh hợp lệ?) then (Không)
  :Thông báo lỗi;
  stop
else (Có)
  :Lưu điểm danh;
endif
if (Có mặt hoặc vắng không phép?) then (Có)
  :Tạo/kích hoạt khoản học phí;
else (Không)
  :Huỷ khoản học phí nếu có;
endif
:Hiển thị kết quả điểm danh;
stop
@enduml
`);

writePuml('collaboration-diem-danh', `
@startuml
skinparam linetype ortho
skinparam object {
  BackgroundColor White
  BorderColor Black
}
object ":Giáo viên" as Teacher
object ":Màn hình điểm danh" as Screen
object ":Xử lý điểm danh" as Handler
object ":Buổi học" as Session
object ":Ghi danh" as Enrollment
object ":Điểm danh" as Attendance
object ":Khoản học phí" as Fee

Teacher -down-> Screen : 1: chọn buổi học và học sinh()
Screen -right-> Handler : 1.1: gửi trạng thái điểm danh()
Handler -down-> Session : 1.1.1: kiểm tra buổi học()
Session -up-> Handler : 1.1.2: trả trạng thái buổi học()
Handler -right-> Enrollment : 1.2.1: kiểm tra học sinh thuộc lớp()
Enrollment -left-> Handler : 1.2.2: trả ghi danh hợp lệ()
Handler -down-> Attendance : 1.3.1: lưu trạng thái điểm danh()
Attendance -up-> Handler : 1.3.2: trả bản ghi điểm danh()
Handler -right-> Fee : 1.4.1: đồng bộ khoản học phí()
Fee -left-> Handler : 1.4.2: trả kết quả đồng bộ()
Handler -left-> Screen : 1.5: trả kết quả điểm danh()
Screen -up-> Teacher : 1.6: hiển thị kết quả()
@enduml
`);

writePuml('state-hoc-sinh', `
@startuml
state "Đang học" as Active
state "Chờ lưu trữ" as PendingArchive
state "Đã lưu trữ" as Archived
[*] --> Active
Active --> PendingArchive : Nghỉ học còn công nợ
Active --> Archived : Nghỉ học không còn công nợ
PendingArchive --> Archived : Công nợ bằng 0 và lưu trữ
Archived --> Active : Học lại
@enduml
`);

writePuml('state-buoi-hoc', `
@startuml
state "Đã lên lịch" as Scheduled
state "Đang diễn ra" as InProgress
state "Đã hoàn tất" as Completed
state "Đã huỷ" as Cancelled
[*] --> Scheduled
Scheduled --> InProgress : Đến giờ học
InProgress --> Completed : Hết giờ học
Scheduled --> Cancelled : Giáo viên huỷ
InProgress --> Cancelled : Giáo viên huỷ
Completed --> [*]
Cancelled --> [*]
@enduml
`);

function includeGraphic(file, caption = file.replaceAll('-', ' ')) {
  return `\\begin{figure}[H]
    \\centering
    \\includegraphics[width=0.95\\textwidth,height=0.72\\textheight,keepaspectratio]{diagrams/${file}.png}
    \\caption{${escapeLatex(caption)}}
\\end{figure}`;
}

const sequenceDiagramsByUseCase = {
  'dang-nhap': ['sequence-dang-nhap'],
  'quan-ly-ghi-danh': ['sequence-ghi-danh'],
  'diem-danh-buoi-hoc': ['sequence-diem-danh'],
};

const collaborationDiagramsByUseCase = {
  'quan-ly-ghi-danh': ['collaboration-ghi-danh'],
  'diem-danh-buoi-hoc': ['collaboration-diem-danh'],
};

function useCaseSection(uc) {
  const sequenceDiagrams = sequenceDiagramsByUseCase[uc.id] ?? [];
  const collaborationDiagrams = collaborationDiagramsByUseCase[uc.id] ?? [];
  return `
\\subsubsection{${escapeLatex(uc.title)}}

\\textbf{Tóm tắt:} ${escapeLatex(uc.summary)}

\\textbf{Tác nhân:} ${escapeLatex(uc.actor)}

\\textbf{Tiền điều kiện}
\\begin{itemize}[leftmargin=*]
${lines(uc.preconditions)}
\\end{itemize}

\\textbf{Dòng sự kiện chính}
\\begin{enumerate}[leftmargin=*]
${lines(uc.main)}
\\end{enumerate}

\\textbf{Dòng sự kiện phụ}
\\begin{itemize}[leftmargin=*]
${lines(uc.alt)}
\\end{itemize}

\\textbf{Hậu điều kiện}
\\begin{itemize}[leftmargin=*]
${lines(uc.postconditions)}
\\end{itemize}

\\textbf{Sơ đồ luồng dữ liệu}

${includeGraphic(`dfd-${uc.id}`, `Sơ đồ luồng dữ liệu: ${uc.name}`)}

\\textbf{Sơ đồ hoạt động}

${includeGraphic(`activity-${uc.id}`, `Sơ đồ hoạt động: ${uc.name}`)}

${sequenceDiagrams.length > 0 ? `\\textbf{Sơ đồ tuần tự}

${sequenceDiagrams.map((diagram) => includeGraphic(diagram, `Sơ đồ tuần tự: ${uc.name}`)).join('\n')}` : ''}

${collaborationDiagrams.length > 0 ? `\\textbf{Sơ đồ cộng tác}

${collaborationDiagrams.map((diagram) => includeGraphic(diagram, `Sơ đồ cộng tác: ${uc.name}`)).join('\n')}` : ''}
`;
}

const latex = `\\documentclass[12pt,a4paper]{article}

%!TEX program = pdflatex

% =============================================================================
% 1. PHÔNG CHỮ & NGÔN NGỮ (Hỗ trợ Tiếng Việt)
% =============================================================================
\\usepackage[utf8]{inputenc}
\\usepackage[T5]{fontenc}
\\usepackage[vietnamese]{babel}

% =============================================================================
% 2. BỐ CỤC TRANG (LAYOUT)
% =============================================================================
\\usepackage[margin=2.5cm]{geometry}
\\usepackage{setspace}
\\onehalfspacing

% =============================================================================
% 3. ĐỒ HỌA & BIỂU ĐỒ (TikZ & DFD Styles)
% =============================================================================
\\usepackage{graphicx}
\\usepackage{tikz}
\\usetikzlibrary{arrows.meta, positioning, shapes.geometric}

\\tikzset{
    process/.style={ellipse, draw, minimum width=3cm, minimum height=1.5cm, align=center},
    entity/.style={rectangle, draw, minimum width=2.5cm, minimum height=1cm, align=center},
    datastore/.style={
        draw=none, align=center, minimum width=3cm,
        append after command={
            [shorten <= -0.2cm, shorten >= -0.2cm]
            (\\tikzlastnode.north west) edge (\\tikzlastnode.north east)
            (\\tikzlastnode.south west) edge (\\tikzlastnode.south east)
        }
    },
    arrow/.style={-Stealth, thick}
}

% =============================================================================
% 4. BẢNG BIỂU & DANH SÁCH
% =============================================================================
\\usepackage{array}
\\usepackage{booktabs}
\\usepackage{multirow}
\\usepackage{longtable}
\\usepackage{float}
\\usepackage{enumitem}
\\usepackage{tabularx}
\\usepackage{makecell}
\\usepackage{colortbl}

% =============================================================================
% 5. TIỆN ÍCH VĂN BẢN & LIÊN KẾT
% =============================================================================
\\usepackage{xcolor}
\\usepackage{titlesec}
\\usepackage{tocloft}
\\usepackage{xurl}
\\usepackage{seqsplit}
\\usepackage{hyperref}

\\hypersetup{
    colorlinks=false,
    hidelinks,
    pdftitle={Mô hình hóa yêu cầu chức năng},
    pdfauthor={Tên của bạn}
}

% =============================================================================
% 6. ĐỊNH DẠNG ĐOẠN VĂN & ĐÁNH SỐ MỤC
% =============================================================================
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}
\\setcounter{secnumdepth}{3}

\\renewcommand{\\thesection}{\\Roman{section}}
\\renewcommand{\\thesubsection}{\\arabic{subsection}}
\\renewcommand{\\thesubsubsection}{\\thesubsection.\\arabic{subsubsection}}

\\titleformat{\\section}{\\large\\bfseries}{\\thesection.}{0.5em}{}
\\titleformat{\\subsection}{\\normalsize\\bfseries}{\\thesubsection.}{0.5em}{}
\\titleformat{\\subsubsection}{\\normalsize\\itshape\\bfseries}{\\thesubsubsection.}{0.5em}{}

\\titleformat{\\paragraph}[block]{\\normalsize\\bfseries}{}{0pt}{}
\\titlespacing*{\\paragraph}{0pt}{6pt}{0pt}

% =============================================================================
% 7. MỤC LỤC (TOC)
% =============================================================================
\\renewcommand{\\cftsecaftersnum}{.}
\\renewcommand{\\cftsubsecaftersnum}{.}
\\renewcommand{\\cftsubsubsecaftersnum}{.}

% =============================================================================
% 8. CUSTOM COMMANDS & COLUMN TYPES
% =============================================================================
\\newcolumntype{C}[1]{>{\\centering\\arraybackslash}p{#1}}
\\newcolumntype{L}[1]{>{\\raggedright\\arraybackslash}p{#1}}
\\newcolumntype{Y}{>{\\raggedright\\arraybackslash}X}
\\newcommand{\\subsubsubsection}[1]{\\paragraph{#1}}
\\newcommand{\\tablesetup}{\\small\\setlength{\\tabcolsep}{3pt}\\renewcommand{\\arraystretch}{1.2}}
\\newcommand{\\code}[1]{{\\ttfamily\\seqsplit{#1}}}
\\newcommand{\\seqpdf}[1]{%
\\IfFileExists{#1}{%
    \\includegraphics[page=1,width=1.05\\textwidth,height=0.95\\textheight,keepaspectratio]{#1}%
}{%
    \\fbox{%
        \\parbox[c][0.28\\textheight][c]{0.9\\textwidth}{%
            \\centering
            Chưa tìm thấy file \\texttt{#1}.\\\\[4pt]
            Hãy upload đúng file PDF này lên Overleaf.
        }%
    }%
}%
}

\\begin{document}

\\section{Mô hình hóa yêu cầu chức năng}

Phần này trình bày mô hình hóa yêu cầu chức năng của hệ thống TMS. Các sơ đồ
tập trung vào nghiệp vụ, luồng dữ liệu và tương tác giữa người dùng với hệ
thống. Phần này không đi sâu vào chi tiết cài đặt hay cấu trúc mã nguồn.

\\subsection{Tác nhân và sơ đồ use case tổng quan}

Các tác nhân chính của hệ thống gồm Giáo viên, Quản trị viên và Học sinh. Bên
cạnh đó, Discord và Codeforces là các hệ thống ngoài đóng vai trò tác nhân hỗ
trợ. Discord hỗ trợ các chức năng xác thực, thiết lập guild, gửi thông báo và
điểm danh voice. Codeforces hỗ trợ dữ liệu Gym và bảng xếp hạng.

${includeGraphic('use-case-overview', 'Sơ đồ use case tổng quan')}

\\subsection{Danh sách use case}

\\begin{longtable}{L{3.2cm} L{11cm}}
\\toprule
\\textbf{Tác nhân} & \\textbf{Use case} \\\\
\\midrule
\\endhead
Giáo viên & Đăng nhập; Xem tổng quan giảng dạy; Cập nhật hồ sơ cá nhân; Liên kết tài khoản Discord; Quản lý học sinh; Quản lý ghi danh học sinh; Xử lý học sinh chờ lưu trữ; Quản lý lớp học; Quản lý lịch học định kỳ; Quản lý buổi học; Điểm danh buổi học; Theo dõi kết quả học tập; Quản lý giao dịch tài chính; Xem báo cáo tài chính; Thiết lập Discord cho lớp học; Gửi thông báo cho học sinh; Gắn Gym Codeforces cho lớp học; Xem bảng xếp hạng Gym. \\\\
Quản trị viên & Đăng nhập; Quản lý tài khoản giáo viên; Cấu hình bot Discord. \\\\
Học sinh & Uỷ quyền quản lý Discord Guild. \\\\
Discord & Tác nhân hỗ trợ cho các use case liên quan đến Discord OAuth, guild, channel, tin nhắn và voice state. \\\\
Codeforces & Tác nhân hỗ trợ cho các use case liên quan đến Gym và bảng xếp hạng. \\\\
\\bottomrule
\\end{longtable}

\\subsection{Quy ước mô tả chức năng}

Mỗi chức năng được mô tả bằng tóm tắt, tác nhân, tiền điều kiện, dòng sự kiện
chính, dòng sự kiện phụ, hậu điều kiện, sơ đồ luồng dữ liệu và sơ đồ hoạt động.
DFD được sử dụng cho mọi chức năng để mô tả dữ liệu đi từ tác nhân ngoài vào
khối xử lý, dữ liệu được đọc/ghi ở kho dữ liệu và dữ liệu đầu ra trả về cho tác
nhân. Activity diagram được đặt riêng trong từng use case để mô tả luồng xử lý
của use case đó. Các sequence diagram hoặc collaboration diagram chỉ được bổ
sung trong chính use case liên quan khi luồng đủ phức tạp.

\\subsection{Mô tả chi tiết các use case}

${useCases.map(useCaseSection).join('\n')}

\\subsection{Sơ đồ trạng thái}

State diagram là phần mô hình hóa vòng đời của đối tượng, không phải mô hình
hóa chức năng. Vì vậy phần này chỉ vẽ các đối tượng có trạng thái nghiệp vụ
quan trọng. Việc chọn các đối tượng dưới đây không có nghĩa hệ thống chỉ có các
đối tượng này có trạng thái; các đối tượng khác có thể có status hoặc type
nhưng không đủ phức tạp để cần mô hình trạng thái riêng.

\\subsubsection{Trạng thái học sinh}
${includeGraphic('state-hoc-sinh', 'Sơ đồ trạng thái đối tượng Học sinh')}

\\subsubsection{Trạng thái buổi học}
${includeGraphic('state-buoi-hoc', 'Sơ đồ trạng thái đối tượng Buổi học')}

\\end{document}
`;

fs.writeFileSync(path.join(reportDir, 'functional-requirements-modeling.tex'), latex, 'utf8');

console.log(`Generated ${useCases.length} use cases into ${reportDir}`);
