import {
  Input,
  InputGroup,
  InputGroupProps,
  InputLeftElement,
  InputProps,
  InputRightElement,
} from '@chakra-ui/react'
import {
  Control,
  Controller,
  ControllerProps,
  FieldValues,
  Path,
} from 'react-hook-form'
import NumberFormat from 'react-number-format'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'

const CryptoInput = (props: InputProps) => (
  <Input
    pr="4.5rem"
    pl="7.5rem"
    size="xl"
    minHeight={12}
    fontSize={getFontSizeT()}
    type="number"
    variant="filled"
    placeholder="Enter amount"
    {...props}
  />
);

var valueTrade: number | undefined;
var convertT: number | undefined;

const getFontSizeT = () => {
  if (valueTrade == undefined || valueTrade == 1 || valueTrade == null)
    return "18px";
  if (valueTrade !== undefined) {
    const length = valueTrade;
    if (length >= 18) return "9px";
    if (length >= 16) return "11px";
    if (length >= 14) return "12px";
    if (length >= 12) return "13px";
    if (length >= 10) return "15px";
    if (length >= 9) return "15px";
    if (length >= 8) return "16px";
    if (length >= 7) return "16px";
    if (length >= 6) return "17px";
    if (length >= 5) return "17px";
    if (length >= 4) return "17px";
    if (length >= 3) return "17px";
    if (length >= 2) return "17px";
    return "18px";
  }
  return "18px";
};

type TokenRowProps<C extends FieldValues> = {
  control: Control<C>;
  fieldName: Path<C>;
  disabled?: boolean;
  rules?: ControllerProps["rules"];
  inputLeftElement?: React.ReactNode;
  inputRightElement?: React.ReactNode;
  onInputChange?: any;
} & InputGroupProps;

export function TokenRow<C extends FieldValues>({
  control,
  fieldName,
  rules,
  inputLeftElement,
  inputRightElement,
  onInputChange,
  disabled,
  ...rest
}: TokenRowProps<C>) {
  const {
    number: { localeParts },
  } = useLocaleFormatter({ fiatType: "USD" });

  return (
    <InputGroup size="lg" {...rest}>
      {inputLeftElement && (
        <InputLeftElement ml={1} width="auto">
          {inputLeftElement}
        </InputLeftElement>
      )}
      <Controller
        render={({ field: { onChange, value } }) => {
          return (
            <NumberFormat
              inputMode="decimal"
              thousandSeparator={localeParts.group}
              decimalSeparator={localeParts.decimal}
              customInput={CryptoInput}
              isNumericString={true}
              value={value}
              disabled={disabled}
              onValueChange={(e) => {
                onInputChange && e.value !== value && onInputChange(e.value);
                valueTrade = value?.length;
                onChange(e.value);
              }}
            />
          );
        }}
        name={fieldName}
        control={control}
        rules={rules}
      />
      {inputRightElement && (
        <InputRightElement width="4.5rem">
          {inputRightElement}
        </InputRightElement>
      )}
    </InputGroup>
  );
}
