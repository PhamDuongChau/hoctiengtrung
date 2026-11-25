// Danh sách bài học (tự tạo từ giáo trình)
const LESSON_GROUPS = [{ label: "Bài 1–13", from: 1, to: 13 }, { label: "Bài 14–26", from: 14, to: 26 }];
const LESSONS = [
 {
  "id": 1,
  "title": "你好",
  "titleVi": "Xin chào",
  "words": 10,
  "exercises": 3
 },
 {
  "id": 2,
  "title": "学习汉语",
  "titleVi": "Học tiếng Hán",
  "words": 15,
  "exercises": 4
 },
 {
  "id": 3,
  "title": "今天星期几？",
  "titleVi": "Hôm nay thứ mấy?",
  "words": 22,
  "exercises": 6
 },
 {
  "id": 4,
  "title": "你是哪国人？",
  "titleVi": "Bạn là người nước nào?",
  "words": 22,
  "exercises": 3
 },
 {
  "id": 5,
  "title": "请问，您贵姓？",
  "titleVi": "Xin hỏi, quý danh của ngài?",
  "words": 19,
  "exercises": 7
 },
 {
  "id": 6,
  "title": "我是中国留学生",
  "titleVi": "Tôi là du học sinh Trung Quốc",
  "words": 27,
  "exercises": 6
 },
 {
  "id": 7,
  "title": "你家有几口人？",
  "titleVi": "Nhà bạn có mấy người?",
  "words": 20,
  "exercises": 6
 },
 {
  "id": 8,
  "title": "认识你我很高兴",
  "titleVi": "Rất vui được làm quen với bạn",
  "words": 22,
  "exercises": 6
 },
 {
  "id": 9,
  "title": "我要买衣服",
  "titleVi": "Tôi muốn mua quần áo",
  "words": 25,
  "exercises": 7
 },
 {
  "id": 10,
  "title": "我要换钱",
  "titleVi": "Tôi muốn đổi tiền",
  "words": 16,
  "exercises": 8
 },
 {
  "id": 11,
  "title": "去饭馆吃饭",
  "titleVi": "Đi nhà hàng ăn cơm",
  "words": 22,
  "exercises": 5
 },
 {
  "id": 12,
  "title": "你们的老师是谁？",
  "titleVi": "Giáo viên của các bạn là ai?",
  "words": 29,
  "exercises": 7
 },
 {
  "id": 13,
  "title": "让我给你检查一下儿",
  "titleVi": "Để tôi khám cho bạn",
  "words": 19,
  "exercises": 6
 },
 {
  "id": 14,
  "title": "我跟她一起骑车去",
  "titleVi": "Con và bạn ấy cùng đạp xe đi",
  "words": 23,
  "exercises": 6
 },
 {
  "id": 15,
  "title": "今年十二月我们结婚",
  "titleVi": "Tháng mười hai năm nay chúng tôi kết hôn",
  "words": 26,
  "exercises": 5
 },
 {
  "id": 16,
  "title": "我的一天",
  "titleVi": "Một ngày của tôi",
  "words": 37,
  "exercises": 6
 },
 {
  "id": 17,
  "title": "你在做什么呢？",
  "titleVi": "Bạn đang làm gì thế?",
  "words": 20,
  "exercises": 7
 },
 {
  "id": 18,
  "title": "学生可以打工吗？",
  "titleVi": "Học sinh có thể đi làm thêm không?",
  "words": 21,
  "exercises": 6
 },
 {
  "id": 19,
  "title": "她学得很好",
  "titleVi": "Cô ấy học rất tốt",
  "words": 27,
  "exercises": 6
 },
 {
  "id": 20,
  "title": "前边的高楼就是购物中心",
  "titleVi": "Tòa nhà cao tầng phía trước chính là trung tâm thương mại",
  "words": 32,
  "exercises": 6
 },
 {
  "id": 21,
  "title": "我的朋友昨天来北京了",
  "titleVi": "Bạn tôi hôm qua đến Bắc Kinh rồi",
  "words": 16,
  "exercises": 6
 },
 {
  "id": 22,
  "title": "我买了一套新房子",
  "titleVi": "Tôi đã mua một căn nhà mới",
  "words": 30,
  "exercises": 7
 },
 {
  "id": 23,
  "title": "你怎么现在才到？",
  "titleVi": "Sao bây giờ bạn mới đến?",
  "words": 26,
  "exercises": 6
 },
 {
  "id": 24,
  "title": "你喜欢哪个季节？",
  "titleVi": "Bạn thích mùa nào?",
  "words": 33,
  "exercises": 6
 },
 {
  "id": 25,
  "title": "吃完午饭就去车站",
  "titleVi": "Ăn xong cơm trưa thì đi ra bến xe",
  "words": 22,
  "exercises": 6
 },
 {
  "id": 26,
  "title": "国庆节放多长时间的假？",
  "titleVi": "Lễ Quốc khánh nghỉ bao lâu?",
  "words": 26,
  "exercises": 6
 }
];
