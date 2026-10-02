export type FamilyPerson = {
  id: number;
  name: string;
  generation: number;
  role?: string;
  avatar?: string;
  relationship?: string;
  identityNumber?: string;
  birthDate?: string;
  deathDate?: string;
  memorialDate?: string;
  children?: FamilyPerson[];
};

export type FamilyDataMode = 'sample' | 'official' | 'empty';

export const SAMPLE_MEMBER_COUNT = 68;

const secondGeneration = [
  { name: 'Phạm Văn Bình', birthDate: '1956-02-12' },
  { name: 'Phạm Văn Cường', birthDate: '1959-06-18' },
  { name: 'Phạm Văn Dũng', birthDate: '1962-10-24' },
];

const thirdGeneration = [
  ['Phạm Minh Đức', 'Phạm Minh Tuấn', 'Phạm Minh Khải'],
  ['Phạm Minh Khang', 'Phạm Minh Long', 'Phạm Minh Quân'],
  ['Phạm Minh Nam', 'Phạm Minh Phúc', 'Phạm Minh Thắng'],
];

const fourthGeneration = [
  'Phạm Gia Huy', 'Phạm Gia Bảo', 'Phạm Gia Khánh',
  'Phạm Gia Long', 'Phạm Gia Nam', 'Phạm Gia Phúc',
  'Phạm Gia Anh', 'Phạm Gia An', 'Phạm Gia Đạt',
  'Phạm Gia Đình', 'Phạm Gia Đức', 'Phạm Gia Hiếu',
  'Phạm Gia Khoa', 'Phạm Gia Lâm', 'Phạm Gia Minh',
  'Phạm Gia Nghĩa', 'Phạm Gia Phong', 'Phạm Gia Quang',
  'Phạm Gia Sơn', 'Phạm Gia Thành', 'Phạm Gia Thịnh',
  'Phạm Gia Toàn', 'Phạm Gia Trung', 'Phạm Gia Tú',
  'Phạm Gia Việt', 'Phạm Gia Vinh', 'Phạm Gia Yến',
];

const fifthGeneration = [
  'Phạm Quang An', 'Phạm Quang Bách', 'Phạm Quang Chi', 'Phạm Quang Duy',
  'Phạm Quang Giang', 'Phạm Quang Hoa', 'Phạm Quang Khôi', 'Phạm Quang Linh',
  'Phạm Quang Mai', 'Phạm Quang Minh', 'Phạm Quang Ngân', 'Phạm Quang Phúc',
  'Phạm Quang Quý', 'Phạm Quang Sang', 'Phạm Quang Tâm', 'Phạm Quang Thư',
  'Phạm Quang Trí', 'Phạm Quang Uyên', 'Phạm Quang Vân', 'Phạm Quang Yên',
  'Phạm Thanh An', 'Phạm Thanh Bình', 'Phạm Thanh Châu', 'Phạm Thanh Đăng',
  'Phạm Thanh Giang', 'Phạm Thanh Hân', 'Phạm Thanh Khuê', 'Phạm Thanh Lam',
];

function createSampleFamily(): FamilyPerson {
  let nextId = 1;
  let fourthIndex = 0;
  let fifthIndex = 0;

  const makeFifthGeneration = (parentName: string, extraChild = false) => Array.from({ length: extraChild ? 2 : 1 }, (_, index) => ({
    id: nextId++,
    name: fifthGeneration[fifthIndex++],
    generation: 5,
    relationship: `Chút của ${parentName}`,
    birthDate: `201${(fifthIndex + index) % 10}-0${(fifthIndex % 8) + 1}-15`,
  }));

  const makeFourthGeneration = (parentName: string) => Array.from({ length: 3 }, () => {
    const name = fourthGeneration[fourthIndex++];
    return {
      id: nextId++,
      name,
      generation: 4,
      relationship: `Chắt của ${parentName}`,
      birthDate: `198${fourthIndex % 10}-0${(fourthIndex % 8) + 1}-12`,
      children: makeFifthGeneration(name, fourthIndex === 1),
    };
  });

  const root: FamilyPerson = {
    id: nextId++,
    name: 'Phạm Văn An',
    generation: 1,
    role: 'Thủy tổ',
    relationship: 'Thủy tổ dòng họ',
    birthDate: '1930-01-01',
    children: secondGeneration.map((second, secondIndex) => ({
      id: nextId++,
      name: second.name,
      generation: 2,
      role: `Trưởng chi ${secondIndex + 1}`,
      relationship: 'Con của Phạm Văn An',
      birthDate: second.birthDate,
      children: thirdGeneration[secondIndex].map((name, thirdIndex) => ({
        id: nextId++,
        name,
        generation: 3,
        relationship: `Cháu nội của ${second.name}`,
        birthDate: `197${(secondIndex * 3 + thirdIndex) % 10}-0${thirdIndex + 2}-08`,
        children: makeFourthGeneration(name),
      })),
    })),
  };

  return root;
}

// Bộ dữ liệu được chia theo 5 đời: 1 + 3 + 9 + 27 + 28 = 68 thành viên.
export const initialFamily: FamilyPerson = createSampleFamily();

// Khung rỗng được tạo sau khi quản trị cấp cao xác nhận bắt đầu dữ liệu chính thức.
export const officialFamilyTemplate: FamilyPerson = {
  id: 1,
  name: 'Chưa có thông tin',
  generation: 1,
  role: 'Thủy tổ',
  relationship: 'Bắt đầu dữ liệu chính thức',
  children: [],
};

export function cloneFamily<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

export function flattenFamily(root: FamilyPerson): FamilyPerson[] {
  return [root, ...(root.children?.flatMap(flattenFamily) ?? [])];
}
