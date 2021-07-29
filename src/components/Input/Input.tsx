import {
  Input as ChakraInput,
  InputProps as ChakraInputProps,
} from "@chakra-ui/react";
import { FC } from "react";

interface InputProps extends ChakraInputProps {
  disabled?: boolean;
}

const Input: FC<InputProps> = (props) => {
  const { ...rest } = props;

  return (
    <ChakraInput
      _focus={{
        borderColor: "#14e464 !important",
        boxShadow: "0 0 0 2px #14e4648f !important",
      }}
      {...rest}
    />
  );
};

export default Input;
