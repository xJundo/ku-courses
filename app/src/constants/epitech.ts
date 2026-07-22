export const EPITECH_VALIDATED_COURSES = new Set([
  'SLSC256',
  'SLSC220',
  'SLSC221',
  'SLSC223',
  'SLSC253',
  'SLSC258',
  'BIDS209-00',
  'EIEN443-00',
  'DCCS409-00',
  'BIDS203-00',
  'NAST205-00',
  'NAST307-00',
  'DCCS201-01',
  'DCCS201-02',
  'EIEN233-02',
  'DIGB241-00',
  'DCCS203-01',
  'DSSP341-00',
  'EIEN305-02',
  'DSSP345-00',
  'ENGS252-00',
  'ENGS251-00',
  'ENGS202-00',
  'ENGS201-00',
  'SPOB207-02',
  'SPOB207-03',
  'SPOB207-04',
  'GLOB301-00',
  'DCCS211-00',
  'EMSE423-00',
  'SECU215-00',
  'GLOB201-02',
  'GLOB201-01',
  'SPOS305-02',
  'ENGS311-00',
  'EMSE443-00',
  'EMSE351-00',
  'EIEN365-03',
  'BIDS303-00',
  'DIGB221-00'
]);

export function isEpitechCourse(courCd: string, courCls?: string): boolean {
  if (!courCd) return false;
  const cleanCode = courCd.trim().toUpperCase();
  const cleanCls = courCls ? courCls.trim() : '';
  const fullKey = cleanCls ? `${cleanCode}-${cleanCls}` : cleanCode;

  return EPITECH_VALIDATED_COURSES.has(fullKey) || EPITECH_VALIDATED_COURSES.has(cleanCode);
}
