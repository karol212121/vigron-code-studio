export interface AutocompleteSuggestion {
  word: string;
  type: "keyword" | "function" | "snippet" | "tag";
  description: string;
  insertText: string;
}

const COMMON_KEYWORDS: Record<string, AutocompleteSuggestion[]> = {
  py: [
    { word: "print", type: "function", description: "Konsolga matn chiqarish", insertText: "print(\"\")" },
    { word: "def", type: "keyword", description: "Funksiya e'lon qilish", insertText: "def name():\n    " },
    { word: "import", type: "keyword", description: "Kutubxonani yuklash", insertText: "import " },
    { word: "from", type: "keyword", description: "Kutubxonadan yuklash", insertText: "from " },
    { word: "class", type: "keyword", description: "Klass yaratish", insertText: "class Name:\n    def __init__(self):\n        " },
    { word: "if", type: "keyword", description: "Shart operatori", insertText: "if condition:\n    " },
    { word: "elif", type: "keyword", description: "Qo'shimcha shart", insertText: "elif condition:\n    " },
    { word: "else", type: "keyword", description: "Aks holda", insertText: "else:\n    " },
    { word: "for", type: "keyword", description: "For sikli", insertText: "for i in range(10):\n    " },
    { word: "while", type: "keyword", description: "While sikli", insertText: "while condition:\n    " },
    { word: "return", type: "keyword", description: "Qiymat qaytarish", insertText: "return " },
    { word: "try", type: "keyword", description: "Xatolikni tekshirish", insertText: "try:\n    \nexcept Exception as e:\n    " },
    { word: "except", type: "keyword", description: "Xatolik bloklanishi", insertText: "except Exception as e:\n    " },
    { word: "as", type: "keyword", description: "Nom o'zgartirish", insertText: "as " },
    { word: "with", type: "keyword", description: "Konteks boshqaruvchisi", insertText: "with open(\"file.txt\", \"r\") as f:\n    " },
    { word: "lambda", type: "keyword", description: "Anonim funksiya", insertText: "lambda x: " },
    { word: "None", type: "keyword", description: "Bo'sh qiymat", insertText: "None" },
    { word: "True", type: "keyword", description: "Mantiqiy rost", insertText: "True" },
    { word: "False", type: "keyword", description: "Mantiqiy yolg'on", insertText: "False" },
    { word: "len", type: "function", description: "Uzunlikni aniqlash", insertText: "len()" },
    { word: "range", type: "function", description: "Ketma-ketlik yaratish", insertText: "range()" },
    { word: "append", type: "function", description: "Ro'yxatga element qo'shish", insertText: "append()" },
    { word: "input", type: "function", description: "Ma'lumot kiritish", insertText: "input(\"Kiriting: \")" },
    { word: "int", type: "function", description: "Butun songa o'tkazish", insertText: "int()" },
    { word: "str", type: "function", description: "Satrga o'tkazish", insertText: "str()" },
    { word: "dict", type: "function", description: "Lug'at yaratish", insertText: "dict()" },
    { word: "list", type: "function", description: "Ro'yxat yaratish", insertText: "list()" }
  ],
  js: [
    { word: "console.log", type: "function", description: "Konsolga chiqarish", insertText: "console.log(\"\");" },
    { word: "const", type: "keyword", description: "O'zgarmas e'lon qilish", insertText: "const name = " },
    { word: "let", type: "keyword", description: "O'zgaruvchi e'lon qilish", insertText: "let name = " },
    { word: "function", type: "keyword", description: "Funksiya e'lon qilish", insertText: "function name() {\n  \n}" },
    { word: "arrow", type: "snippet", description: "Arrow funksiya", insertText: "const name = () => {\n  \n};" },
    { word: "if", type: "keyword", description: "Shart operatori", insertText: "if (condition) {\n  \n}" },
    { word: "else", type: "keyword", description: "Aks holda", insertText: "else {\n  \n}" },
    { word: "for", type: "keyword", description: "For sikli", insertText: "for (let i = 0; i < array.length; i++) {\n  \n}" },
    { word: "forEach", type: "function", description: "Massiv sikli", insertText: "forEach((item) => {\n  \n})" },
    { word: "map", type: "function", description: "Massivni o'zgartirish", insertText: "map((item) => {\n  return \n})" },
    { word: "filter", type: "function", description: "Elementlarni filtrlash", insertText: "filter((item) => item !== null)" },
    { word: "return", type: "keyword", description: "Qiymat qaytarish", insertText: "return " },
    { word: "import", type: "keyword", description: "Modul yuklash", insertText: "import name from \"module\";" },
    { word: "export", type: "keyword", description: "Modul eksport qilish", insertText: "export const name = " },
    { word: "async", type: "keyword", description: "Asinxron funksiya", insertText: "async " },
    { word: "await", type: "keyword", description: "Kutish operatori", insertText: "await " },
    { word: "try", type: "keyword", description: "Xatolikni tekshirish", insertText: "try {\n  \n} catch (error) {\n  \n}" },
    { word: "setTimeout", type: "function", description: "Kechiktirib ishga tushirish", insertText: "setTimeout(() => {\n  \n}, 1000);" },
    { word: "setInterval", type: "function", description: "Takroriy ishga tushirish", insertText: "setInterval(() => {\n  \n}, 1000);" },
    { word: "Promise", type: "keyword", description: "Promise obyekti", insertText: "new Promise((resolve, reject) => {\n  \n})" },
    { word: "JSON.stringify", type: "function", description: "Obyektni matnga o'tkazish", insertText: "JSON.stringify()" },
    { word: "JSON.parse", type: "function", description: "Matnni obyektga o'tkazish", insertText: "JSON.parse()" },
    { word: "document.getElementById", type: "function", description: "ID orqali element olish", insertText: "document.getElementById(\"\")" },
    { word: "document.querySelector", type: "function", description: "Selektor orqali element olish", insertText: "document.querySelector(\"\")" }
  ],
  ts: [
    { word: "interface", type: "keyword", description: "Interfeys e'lon qilish", insertText: "interface Name {\n  id: number;\n}" },
    { word: "type", type: "keyword", description: "Tur e'lon qilish", insertText: "type Name = " },
    { word: "enum", type: "keyword", description: "Enum yaratish", insertText: "enum Name {\n  First,\n  Second\n}" },
    { word: "private", type: "keyword", description: "Yopiq xususiyat", insertText: "private " },
    { word: "public", type: "keyword", description: "Ochiq xususiyat", insertText: "public " },
    { word: "readonly", type: "keyword", description: "Faqat o'qish uchun", insertText: "readonly " },
    { word: "as", type: "keyword", description: "Tur o'zgartirish (casting)", insertText: " as " },
    { word: "any", type: "keyword", description: "Istalgan tur", insertText: "any" },
    { word: "string", type: "keyword", description: "Matn turi", insertText: "string" },
    { word: "number", type: "keyword", description: "Son turi", insertText: "number" },
    { word: "boolean", type: "keyword", description: "Mantiqiy tur", insertText: "boolean" },
    { word: "console.log", type: "function", description: "Konsolga chiqarish", insertText: "console.log(\"\");" },
    { word: "function", type: "keyword", description: "Funksiya e'lon qilish", insertText: "function name() {\n  \n}" }
  ],
  tsx: [
    { word: "React.FC", type: "keyword", description: "Funktsional React komponenti turi", insertText: "const MyComp: React.FC = () => {\n  return (\n    <div>\n      \n    </div>\n  );\n};" },
    { word: "useState", type: "function", description: "React useState hook", insertText: "const [state, setState] = useState();" },
    { word: "useEffect", type: "function", description: "React useEffect hook", insertText: "useEffect(() => {\n  \n}, []);" },
    { word: "useRef", type: "function", description: "React useRef hook", insertText: "const myRef = useRef(null);" },
    { word: "useCallback", type: "function", description: "React useCallback hook", insertText: "const cb = useCallback(() => {\n  \n}, []);" },
    { word: "useMemo", type: "function", description: "React useMemo hook", insertText: "const val = useMemo(() => {\n  return \n}, []);" },
    { word: "className", type: "keyword", description: "HTML klass atributi", insertText: "className=\"\"" },
    { word: "export default", type: "keyword", description: "Asosiy eksport", insertText: "export default function MyComponent() {\n  return (\n    <div>\n      \n    </div>\n  );\n}" }
  ],
  jsx: [
    { word: "useState", type: "function", description: "React useState hook", insertText: "const [state, setState] = useState();" },
    { word: "useEffect", type: "function", description: "React useEffect hook", insertText: "useEffect(() => {\n  \n}, []);" },
    { word: "className", type: "keyword", description: "HTML klass atributi", insertText: "className=\"\"" },
    { word: "export default", type: "keyword", description: "Asosiy eksport", insertText: "export default function MyComponent() {\n  return (\n    <div>\n      \n    </div>\n  );\n}" }
  ],
  dart: [
    { word: "void main", type: "function", description: "Dart dasturining boshlanishi", insertText: "void main() {\n  print('Salom, Dunyo!');\n}" },
    { word: "print", type: "function", description: "Konsolga chiqarish", insertText: "print('');" },
    { word: "class", type: "keyword", description: "Dart klassi", insertText: "class Name {\n  final String id;\n  Name({required this.id});\n}" },
    { word: "import", type: "keyword", description: "Kutubxona yuklash", insertText: "import 'package:flutter/material.dart';" },
    { word: "StatelessWidget", type: "snippet", description: "Flutter Stateless vidjeti", insertText: "class MyWidget extends StatelessWidget {\n  const MyWidget({super.key});\n\n  @override\n  Widget build(BuildContext context) {\n    return Container();\n  }\n}" },
    { word: "StatefulWidget", type: "snippet", description: "Flutter Stateful vidjeti", insertText: "class MyWidget extends StatefulWidget {\n  const MyWidget({super.key});\n\n  @override\n  State<MyWidget> createState() => _MyWidgetState();\n}\n\nclass _MyWidgetState extends State<MyWidget> {\n  @override\n  Widget build(BuildContext context) {\n    return Container();\n  }\n}" },
    { word: "MaterialApp", type: "snippet", description: "Flutter Material ilova asosi", insertText: "MaterialApp(\n  title: 'My App',\n  home: Scaffold(\n    body: Center(\n      child: Text('Salom Flutter'),\n    ),\n  ),\n)" },
    { word: "Scaffold", type: "snippet", description: "Scaffold struktura", insertText: "Scaffold(\n  appBar: AppBar(title: const Text('Home')),\n  body: const Center(child: Text('Salom Flutter')),\n)" },
    { word: "Container", type: "snippet", description: "Konteyner vidjeti", insertText: "Container(\n  padding: const EdgeInsets.all(8.0),\n  child: \n)" },
    { word: "Column", type: "snippet", description: "Ustun layout", insertText: "Column(\n  mainAxisAlignment: MainAxisAlignment.center,\n  children: [\n    \n  ],\n)" },
    { word: "Row", type: "snippet", description: "Satr layout", insertText: "Row(\n  mainAxisAlignment: MainAxisAlignment.center,\n  children: [\n    \n  ],\n)" },
    { word: "Text", type: "snippet", description: "Matn vidjeti", insertText: "Text('Text content')" },
    { word: "Navigator", type: "function", description: "Navigatsiya qilish", insertText: "Navigator.push(context, MaterialPageRoute(builder: (context) => const SecondScreen()));" }
  ],
  html: [
    { word: "div", type: "tag", description: "Konteyner elementi", insertText: "<div>\n  \n</div>" },
    { word: "span", type: "tag", description: "Matn segmenti", insertText: "<span></span>" },
    { word: "p", type: "tag", description: "Paragraf matni", insertText: "<p></p>" },
    { word: "h1", type: "tag", description: "Asosiy sarlavha (H1)", insertText: "<h1 class=\"text-2xl font-bold\"></h1>" },
    { word: "h2", type: "tag", description: "Yordamchi sarlavha (H2)", insertText: "<h2 class=\"text-xl font-bold\"></h2>" },
    { word: "h3", type: "tag", description: "H3 sarlavha", insertText: "<h3 class=\"text-lg font-bold\"></h3>" },
    { word: "a", type: "tag", description: "Giperhavola (Link)", insertText: "<a href=\"#\" class=\"text-emerald-500 hover:underline\"></a>" },
    { word: "button", type: "tag", description: "Bosiladigan tugma", insertText: "<button class=\"bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl font-semibold\">\n  \n</button>" },
    { word: "img", type: "tag", description: "Rasm joylashtirish", insertText: "<img src=\"\" alt=\"\" class=\"w-full rounded-xl\" />" },
    { word: "input", type: "tag", description: "Kiritish maydoni", insertText: "<input type=\"text\" placeholder=\"Kiriting...\" class=\"bg-slate-800 text-white rounded-xl p-2\" />" },
    { word: "form", type: "tag", description: "Forma", insertText: "<form onSubmit=\"\">\n  \n</form>" },
    { word: "script", type: "tag", description: "JS script ulash", insertText: "<script>\n  \n</script>" },
    { word: "style", type: "tag", description: "CSS uslublar ulash", insertText: "<style>\n  \n</style>" },
    { word: "ul", type: "tag", description: "Tartibsiz ro'yxat", insertText: "<ul>\n  <li></li>\n</ul>" },
    { word: "li", type: "tag", description: "Ro'yxat elementi", insertText: "<li></li>" },
    { word: "meta", type: "tag", description: "Meta tegi", insertText: "<meta charset=\"UTF-8\">" },
    { word: "boilerplate", type: "snippet", description: "Standart HTML shabloni", insertText: "<!DOCTYPE html>\n<html lang=\"uz\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Sahifa</title>\n</head>\n<body class=\"bg-slate-950 text-slate-100\">\n  \n</body>\n</html>" }
  ],
  css: [
    { word: "color", type: "keyword", description: "Matn rangi", insertText: "color: ;" },
    { word: "background-color", type: "keyword", description: "Orqa fon rangi", insertText: "background-color: ;" },
    { word: "font-size", type: "keyword", description: "Shrift o'lchami", insertText: "font-size: px;" },
    { word: "font-weight", type: "keyword", description: "Shrift qalinligi", insertText: "font-weight: bold;" },
    { word: "margin", type: "keyword", description: "Tashqi masofa (margin)", insertText: "margin: ;" },
    { word: "padding", type: "keyword", description: "Ichki masofa (padding)", insertText: "padding: ;" },
    { word: "display: flex", type: "snippet", description: "Flexbox layout", insertText: "display: flex;\njustify-content: center;\nalign-items: center;" },
    { word: "display: grid", type: "snippet", description: "Grid layout", insertText: "display: grid;\ngrid-template-columns: repeat(3, 1fr);" },
    { word: "border", type: "keyword", description: "Border chegarasi", insertText: "border: 1px solid ;" },
    { word: "border-radius", type: "keyword", description: "Burchaklarni yumaloqlash", insertText: "border-radius: px;" },
    { word: "width", type: "keyword", description: "Kenglik (width)", insertText: "width: %;" },
    { word: "height", type: "keyword", description: "Balandlik (height)", insertText: "height: px;" },
    { word: "box-shadow", type: "keyword", description: "Element soyasi", insertText: "box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" }
  ],
  md: [
    { word: "heading1", type: "snippet", description: "1-darajali sarlavha", insertText: "# sarlavha" },
    { word: "heading2", type: "snippet", description: "2-darajali sarlavha", insertText: "## sarlavha" },
    { word: "link", type: "snippet", description: "Havola qo'shish", insertText: "[Matn](https://)" },
    { word: "image", type: "snippet", description: "Rasm qo'shish", insertText: "![Izoh](rasm_linki)" },
    { word: "code-block", type: "snippet", description: "Kod bloki (Python)", insertText: "```python\n\n```" },
    { word: "code-inline", type: "snippet", description: "Satr ichidagi kod", insertText: "`kod`" },
    { word: "bold", type: "snippet", description: "Qalin matn", insertText: "**matn**" },
    { word: "italic", type: "snippet", description: "Kursiv matn", insertText: "*matn*" },
    { word: "table", type: "snippet", description: "Markdown jadvali", insertText: "| Sarlavha 1 | Sarlavha 2 |\n|---|---|\n| Qiymat 1 | Qiymat 2 |" }
  ]
};

export function getSuggestions(text: string, extension: string): AutocompleteSuggestion[] {
  const ext = extension.toLowerCase();
  const suggestions = COMMON_KEYWORDS[ext as keyof typeof COMMON_KEYWORDS] || [];

  if (!text) return suggestions.slice(0, 6);

  // Get current typed word/token (last non-whitespace segment)
  const lastWordMatch = text.match(/[\w\-.]*$/);
  if (!lastWordMatch) return suggestions.slice(0, 6);

  const query = lastWordMatch[0].toLowerCase();
  if (!query) return suggestions.slice(0, 6);

  return suggestions
    .filter((item) => item.word.toLowerCase().includes(query))
    .slice(0, 6);
}
