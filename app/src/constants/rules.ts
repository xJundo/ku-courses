export const IT_DEPT_REGEX = /computer|electronics|cyber|software|big data|semiconductor|mobility science|digital healthcare|electro-mechanical|standards and intelligence|data computational|ai semiconductor|smart cities|smart ecocity/i;
export const BUSINESS_DEPT_REGEX = /business/i;
export const KOREAN_DEPT_REGEX = /korean/i;

export const CYBER_REGEX = /cyber|security|crypto|forensic|hack/i;
export const ROBOTICS_REGEX = /robot/i;
export const ELECTRONICS_DEPT_AVOID_REGEX = /electronics|semiconductor physics|semiconductor element|electro-mechanical|circuit/i;
export const MATH_HEAVY_REGEX = /mathematic|calculus|\bstatistic|regression|numerical analysis|matrix theory|bayesian|stochastic|probability|linear algebra|discrete math|optimization theory/i;
export const AI_FIT_REGEX = /artificial intelligence|deep learning|machine learning|neural network|generative ai|computer vision|image processing|data science|big data|prompt engineering|natural language/i;
export const SOFTWARE_EASY_REGEX = /programming|software|data structure|algorithm|database|operating system|compiler/i;

export interface CollegeRule {
  college: string;
  regex: RegExp;
}

export const COLLEGE_RULES: CollegeRule[] = [
  {
    college: 'Collège des Sciences & Technologies (College of Science & Technology)',
    regex: /ai cyber security|ai semiconductor|advanced materials chemistry|computer software|electronics and information engineering|biotechnology|food and biotechnology|electro-mechanical|environmental engineering|environmental systems|mobility science|autonomous mobility|semiconductor physics|applied mathematical sciences|data computational|advanced semiconductor process|digital healthcare|pharmaceutical/i
  },
  {
    college: 'Collège Global Business (College of Global Business)',
    regex: /global studies|korean studies in|chinese studies|english studies|german studies|convergence business|digital business|global business|standards and intelligence/i
  },
  {
    college: 'Collège des Politiques Publiques (College of Public Policy)',
    regex: /public administration|public sociology|korean unification|economics and statistics|economic policy|big data science/i
  },
  {
    college: 'Collège Culture & Sports (College of Culture and Sports)',
    regex: /global sport studies|sport business|sport science|cultural heritage convergence|culture creativity|creative writing and media|culture contents/i
  },
  {
    college: 'Division of Smart Cities (unité indépendante)',
    regex: /smart cities|smart ecocity/i
  },
  {
    college: 'Institut d\'Éducation Générale (Institute for General Education)',
    regex: /institute for general education/i
  }
];
