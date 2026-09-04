import type { HuntItem, PlayPack, QuizItem, StoryNode } from './play.types';

function hunt(id: string, label: string, prompt: string, hint: string, aliases: string[] = []): HuntItem {
  return { id, label, prompt, hint, aliases };
}

const HUNT_CLASSROOM: HuntItem[] = [
  hunt('apple', 'táo', 'Tìm quả táo.', 'Màu đỏ, ăn được.', ['apple', 'quả táo']),
  hunt('pen', 'bút', 'Tìm cái bút.', 'Dùng để viết.', ['pen', 'viết']),
  hunt('window', 'cửa sổ', 'Tìm cửa sổ.', 'Chỗ nhìn ra ngoài.', ['window']),
  hunt('red', 'màu đỏ', 'Tìm một thứ màu đỏ.', 'Nhìn quanh lớp.', ['đỏ', 'red']),
  hunt('chair', 'ghế', 'Tìm cái ghế.', 'Chỗ ngồi.', ['chair']),
];

const CARD_ANIMALS: HuntItem[] = [
  hunt('cat', 'mèo', 'Tìm thẻ con mèo.', 'Kêu meo meo.', ['cat', 'con mèo']),
  hunt('dog', 'chó', 'Tìm thẻ con chó.', 'Kêu gâu gâu.', ['dog', 'con chó']),
  hunt('fish', 'cá', 'Tìm thẻ con cá.', 'Sống dưới nước.', ['fish', 'con cá']),
  hunt('bird', 'chim', 'Tìm thẻ con chim.', 'Có cánh, biết bay.', ['bird', 'con chim']),
];

const QUIZ_COLORS: QuizItem[] = [
  {
    id: 'q1',
    prompt: 'Đây là màu gì?',
    emoji: '🟥',
    answers: ['đỏ', 'xanh', 'vàng'],
    correctIndex: 0,
  },
  {
    id: 'q2',
    prompt: 'Con gì kêu gâu gâu?',
    emoji: '🐶',
    answers: ['mèo', 'chó', 'gà'],
    correctIndex: 1,
  },
  {
    id: 'q3',
    prompt: 'Có mấy quả táo?',
    emoji: '🍎🍎🍎',
    answers: ['hai', 'ba', 'bốn'],
    correctIndex: 1,
  },
  {
    id: 'q4',
    prompt: 'Cái này dùng để làm gì?',
    emoji: '✏️',
    answers: ['viết', 'ăn', 'ngủ'],
    correctIndex: 0,
  },
  {
    id: 'q5',
    prompt: 'Con gì biết bay?',
    emoji: '🐦',
    answers: ['cá', 'chim', 'rùa'],
    correctIndex: 1,
  },
];

const STORY_NODES: StoryNode[] = [
  {
    id: 'start',
    text: 'Thỏ muốn đi chơi. Thỏ đi rừng hay ở nhà?',
    choices: [
      { label: 'Rừng', nextId: 'forest' },
      { label: 'Nhà', nextId: 'home' },
    ],
  },
  {
    id: 'forest',
    text: 'Trong rừng có suối trong. Thỏ uống nước hay đi tiếp?',
    choices: [
      { label: 'Uống nước', nextId: 'drink' },
      { label: 'Đi tiếp', nextId: 'lost' },
    ],
  },
  {
    id: 'home',
    text: 'Ở nhà thỏ đọc sách. Đọc xong thỏ rất vui. Hết chuyện!',
    choices: [],
    end: true,
  },
  {
    id: 'drink',
    text: 'Thỏ uống nước mát. Thỏ khỏe và chạy về nhà. Hết chuyện!',
    choices: [],
    end: true,
  },
  {
    id: 'lost',
    text: 'Thỏ đi xa quá, gặp bác Sói hiền. Bác Sói đưa thỏ về. Hết chuyện!',
    choices: [],
    end: true,
  },
];

export const BUILTIN_PACKS: PlayPack[] = [
  { id: 'hunt-classroom', kind: 'hunt', title: 'Săn đồ trong lớp', items: HUNT_CLASSROOM },
  { id: 'cards-animals', kind: 'cards', title: 'Nghe rồi tìm thẻ', items: CARD_ANIMALS },
  { id: 'quiz-starter', kind: 'quiz', title: 'Ảnh cô — Aiva đố', quiz: QUIZ_COLORS },
  {
    id: 'story-rabbit',
    kind: 'story',
    title: 'Thỏ đi chơi',
    storyStartId: 'start',
    story: STORY_NODES,
  },
];

export function packById(id: string, extra: PlayPack[] = []): PlayPack | undefined {
  return extra.find((p) => p.id === id) ?? BUILTIN_PACKS.find((p) => p.id === id);
}

export function defaultPackFor(kind: PlayPack['kind']): PlayPack {
  const found = BUILTIN_PACKS.find((p) => p.kind === kind) ?? BUILTIN_PACKS[0];
  if (!found) throw new Error('missing builtin pack');
  return found;
}
