import {
  Button as ChakraButton,
  ButtonProps as ChakraButtonProps,
} from "@chakra-ui/react";
import { FC } from "react";

interface ButtonProps extends ChakraButtonProps {}

const Button: FC<ButtonProps> = (props) => {
  return (
    <ChakraButton
      _focus={{
        borderColor: "#14e464 !important",
        boxShadow: "0 0 0 3px #14e4648f !important",
      }}
      _active={{ transform: "scale(.995)" }}
      {...props}
    >
      {props.children}
    </ChakraButton>
  );
};

export default Button;
