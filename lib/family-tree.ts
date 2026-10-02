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

export const SAMPLE_MEMBER_COUNT = 168;
export const SAMPLE_GENERATION_COUNTS = [1, 3, 9, 27, 64, 64] as const;

const secondGeneration = [
  { name: 'Phạm Văn Bình', birthDate: '1938-02-12' },
  { name: 'Phạm Văn Cường', birthDate: '1942-06-18' },
  { name: 'Phạm Văn Dũng', birthDate: '1946-10-24' },
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

const givenNames = [
  'An', 'Bách', 'Bảo', 'Châu', 'Đăng', 'Đạt', 'Đức', 'Duy',
  'Giang', 'Hải', 'Hân', 'Hiếu', 'Hoàng', 'Huy', 'Khang', 'Khánh',
  'Khoa', 'Khôi', 'Lâm', 'Linh', 'Long', 'Minh', 'Nam', 'Nghĩa',
  'Phong', 'Phúc', 'Quân', 'Sơn', 'Thắng', 'Thành', 'Trí', 'Việt',
];

const fifthGeneration = ['Quang', 'Thanh'].flatMap((middle) => givenNames.map((given) => `Phạm ${middle} ${given}`));
const sixthGeneration = ['Hữu', 'Ngọc'].flatMap((middle) => givenNames.map((given) => `Phạm ${middle} ${given}`));

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function sampleDate(year: number, index: number, salt = 0) {
  const month = ((index * 5 + salt) % 12) + 1;
  const day = ((index * 7 + salt * 3) % 27) + 1;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function lifeDates(generation: number, index: number): Pick<FamilyPerson, 'birthDate' | 'deathDate' | 'memorialDate'> {
  const birthBase = [1920, 1938, 1956, 1976, 1996, 2019][generation - 1] ?? 2000;
  const birthSpan = [1, 9, 11, 10, 8, 6][generation - 1] ?? 8;
  const birthYear = birthBase + (index % birthSpan);
  const birthDate = sampleDate(birthYear, index, generation);
  const deceased = generation === 1
    || generation === 2
    || (generation === 3 && index % 3 === 0)
    || (generation === 4 && index % 7 === 0)
    || (generation === 5 && index === 7);
  if (!deceased) return { birthDate };
  const deathAge = [68, 74, 61, 43, 24, 0][generation - 1] ?? 60;
  const deathYear = Math.min(2025, birthYear + deathAge + (index % 4));
  const deathDate = sampleDate(deathYear, index, generation + 3);
  return { birthDate, deathDate, memorialDate: deathDate };
}

function roleFor(generation: number, index: number) {
  if (generation === 3 && index % 3 === 0) return `Trưởng nhánh ${Math.floor(index / 3) + 1}`;
  if (generation === 4 && index % 9 === 0) return 'Đại diện nhánh';
  if (generation === 5 && index % 16 === 0) return 'Hậu duệ tiêu biểu';
  if (generation === 6 && index % 16 === 0) return 'Thành viên trẻ';
  return undefined;
}

function createSampleFamily(): FamilyPerson {
  let nextId = 1;
  let fourthIndex = 0;
  let fifthIndex = 0;
  let sixthIndex = 0;

  const makeSixthGeneration = (parentName: string): FamilyPerson[] => {
    const index = sixthIndex++;
    const name = sixthGeneration[index];
    return [{
      id: nextId++,
      name,
      generation: 6,
      role: roleFor(6, index),
      relationship: `Con của ${parentName}`,
      ...lifeDates(6, index),
    }];
  };

  const makeFifthGeneration = (parentName: string, count: number): FamilyPerson[] => Array.from({ length: count }, () => {
    const index = fifthIndex++;
    const name = fifthGeneration[index];
    return {
      id: nextId++,
      name,
      generation: 5,
      role: roleFor(5, index),
      relationship: `Con của ${parentName}`,
      ...lifeDates(5, index),
      children: makeSixthGeneration(name),
    };
  });

  const makeFourthGeneration = (parentName: string): FamilyPerson[] => Array.from({ length: 3 }, () => {
    const index = fourthIndex++;
    const name = fourthGeneration[index];
    const fifthCount = 2 + (index < 10 ? 1 : 0);
    return {
      id: nextId++,
      name,
      generation: 4,
      role: roleFor(4, index),
      relationship: `Con của ${parentName}`,
      ...lifeDates(4, index),
      children: makeFifthGeneration(name, fifthCount),
    };
  });

  const root: FamilyPerson = {
    id: nextId++,
    name: 'Phạm Văn An',
    generation: 1,
    role: 'Thủy tổ',
    relationship: 'Thủy tổ dòng họ',
    ...lifeDates(1, 0),
    children: secondGeneration.map((second, secondIndex) => ({
      id: nextId++,
      name: second.name,
      generation: 2,
      role: `Trưởng chi ${secondIndex + 1}`,
      relationship: 'Con của Phạm Văn An',
      ...lifeDates(2, secondIndex),
      birthDate: second.birthDate,
      children: thirdGeneration[secondIndex].map((name, thirdIndex) => {
        const index = secondIndex * 3 + thirdIndex;
        return {
          id: nextId++,
          name,
          generation: 3,
          role: roleFor(3, index),
          relationship: `Con của ${second.name}`,
          ...lifeDates(3, index),
          children: makeFourthGeneration(name),
        };
      }),
    })),
  };

  return root;
}

// Bộ dữ liệu thử nghiệm: 1 + 3 + 9 + 27 + 64 + 64 = 168 thành viên / 6 đời.
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
