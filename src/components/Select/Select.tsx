import {
  Select as ChakraSelect,
  SelectProps as ChakraSelectProps,
} from "@chakra-ui/react";
import { FC } from "react";

interface SelectProps extends ChakraSelectProps {}

const Select: FC<SelectProps> = (props) => {
  return (
    <ChakraSelect
      _focus={{
        borderColor: "#14e464 !important",
        boxShadow: "0 0 0 2px #14e4648f !important",
      }}
      _placeholder={{
        fontSize: "12px !important",
        color: "#BDBDBD !important",
      }}
      {...props}
    />
  );
};

export default Select;
