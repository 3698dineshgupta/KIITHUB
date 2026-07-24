// Official KIIT University B.Tech curriculum credit structure (KIITDU 2022
// scheme), as supplied by a student from their SAP/ERP grade sheet. Kept
// separate from the Subject catalog (used by Notes/PYQ filtering) because
// several entries here are generic elective slots (e.g. "Professional
// Elective I") rather than named subjects, and the two credit sources would
// otherwise be ambiguous to merge. The SGPA calculator prefers this list
// when available since it carries verified, precise official credits.
export interface CurriculumSubject {
  name: string
  credits: number
}

export interface CurriculumSemester {
  number: number
  totalCredits: number
  subjects: CurriculumSubject[]
}

export const CURRICULUM: Record<string, CurriculumSemester[]> = {
  CSE: [
    {
      number: 1,
      totalCredits: 21,
      subjects: [
        { name: 'Physics', credits: 3 },
        { name: 'Differential Equations & Linear Algebra', credits: 4 },
        { name: 'Science Elective', credits: 2 },
        { name: 'Engineering Elective II', credits: 2 },
        { name: 'Science of Living Systems', credits: 2 },
        { name: 'Environmental Science', credits: 2 },
        { name: 'Physics Lab', credits: 1 },
        { name: 'Programming Lab', credits: 4 },
        { name: 'Engineering Drawing & Graphics', credits: 1 },
      ],
    },
    {
      number: 2,
      totalCredits: 20,
      subjects: [
        { name: 'Chemistry', credits: 3 },
        { name: 'Transform Calculus & Numerical Analysis', credits: 4 },
        { name: 'English', credits: 2 },
        { name: 'Basic Electronics', credits: 2 },
        { name: 'Engineering Elective I', credits: 2 },
        { name: 'HASS Elective I', credits: 2 },
        { name: 'Chemistry Lab', credits: 1 },
        { name: 'Engineering Lab', credits: 1 },
        { name: 'Workshop', credits: 1 },
        { name: 'Yoga', credits: 1 },
        { name: 'Communication Lab', credits: 1 },
      ],
    },
    {
      number: 3,
      totalCredits: 22,
      subjects: [
        { name: 'Scientific & Technical Writing / HASS Elective II', credits: 3 },
        { name: 'Probability & Statistics', credits: 4 },
        { name: 'Industry 4.0 Technologies', credits: 2 },
        { name: 'Data Structures', credits: 4 },
        { name: 'Digital Systems Design', credits: 3 },
        { name: 'Automata Theory & Formal Languages', credits: 4 },
        { name: 'Data Structures Laboratory', credits: 1 },
        { name: 'Digital Systems Design Laboratory', credits: 1 },
      ],
    },
    {
      number: 4,
      totalCredits: 23,
      subjects: [
        { name: 'Scientific & Technical Writing / HASS Elective II', credits: 2 },
        { name: 'Discrete Structures', credits: 4 },
        { name: 'Operating Systems', credits: 3 },
        { name: 'Object Oriented Programming using Java', credits: 3 },
        { name: 'Database Management Systems', credits: 3 },
        { name: 'Computer Organization & Architecture', credits: 4 },
        { name: 'Operating Systems Laboratory', credits: 1 },
        { name: 'Java Programming Laboratory', credits: 1 },
        { name: 'Database Management Systems Laboratory', credits: 1 },
        { name: 'Vocational Elective', credits: 1 },
      ],
    },
    {
      number: 5,
      totalCredits: 22,
      subjects: [
        { name: 'Engineering Economics', credits: 3 },
        { name: 'Design & Analysis of Algorithms', credits: 3 },
        { name: 'Software Engineering', credits: 4 },
        { name: 'Computer Networks', credits: 3 },
        { name: 'Professional Elective I', credits: 3 },
        { name: 'Professional Elective II', credits: 3 },
        { name: 'Algorithms Laboratory', credits: 1 },
        { name: 'Computer Networks Laboratory', credits: 1 },
        { name: 'K-Explore Open Elective I', credits: 1 },
      ],
    },
    {
      number: 6,
      totalCredits: 24,
      subjects: [
        { name: 'HASS Elective III', credits: 3 },
        { name: 'Machine Learning', credits: 4 },
        { name: 'Artificial Intelligence', credits: 3 },
        { name: 'Professional Elective III', credits: 3 },
        { name: 'Open Elective II / Minor I', credits: 3 },
        { name: 'Universal Human Values', credits: 3 },
        { name: 'Artificial Intelligence Laboratory', credits: 1 },
        { name: 'Applications Development Laboratory', credits: 2 },
        { name: 'Mini Project', credits: 2 },
      ],
    },
    {
      number: 7,
      totalCredits: 15,
      subjects: [
        { name: 'Professional Elective IV', credits: 3 },
        { name: 'Engineering Professional Practice', credits: 2 },
        { name: 'Open Elective III / Minor II', credits: 3 },
        { name: 'Project I', credits: 5 },
        { name: 'Internship', credits: 2 },
      ],
    },
    {
      number: 8,
      totalCredits: 15,
      subjects: [
        { name: 'Professional Elective V', credits: 3 },
        { name: 'Open Elective IV / Minor V', credits: 3 },
        { name: 'Project II', credits: 9 },
      ],
    },
  ],
}

export function getCurriculumSemester(branchShortName: string, semesterNumber: number): CurriculumSemester | null {
  const branch = CURRICULUM[branchShortName.toUpperCase()]
  if (!branch) return null
  return branch.find(s => s.number === semesterNumber) ?? null
}
