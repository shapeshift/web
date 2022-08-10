export const validateYat = async ({ value }: { value: string }): Promise<boolean> =>
  /^\p{Extended_Pictographic}{1,5}$/u.test(value)
