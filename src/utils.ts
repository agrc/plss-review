interface DateLike {
  getFullYear(): number;
  getMonth(): number;
}

export const getFiscalYear = (now: DateLike): string => {
  const july = 6; // July is month 6 (0-indexed)
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let fiscalYear = currentYear;
  if (currentMonth >= july) {
    fiscalYear += 1;
  }

  return fiscalYear.toString().slice(-2);
};
