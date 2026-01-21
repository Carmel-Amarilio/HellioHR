export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  positionIds: string[];
  cvUrl: string;
  status: 'active' | 'inactive';
}

export interface Position {
  id: string;
  title: string;
  department: string;
  description: string;
  candidateIds: string[];
}
