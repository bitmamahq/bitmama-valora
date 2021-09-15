import {
  Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay
} from "@chakra-ui/react";
import Button from "./Button/Button";

const Confirmation = ({
  isOpen,
  onClose,
  isLoading,
  onConfirm,
  title,
  children,
  buttonText,
}:any) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      closeOnOverlayClick={false}
    >
      <ModalOverlay />
      <ModalContent bg="#F8F9FD" overflow="hidden" borderRadius="16px">
        <ModalHeader p="26px 0" textAlign="center" bg="white" fontSize="md">
          {title}
        </ModalHeader>
        {/* <ModalCloseButton /> */}
        <ModalBody p="24px 48px">{children}</ModalBody>

        <ModalFooter justifyContent="center" pb="30px" gridGap="14px">
          <Button
            disabled={isLoading}
            minW="120px"
            onClick={onClose}
            bg="transparent"
            border="2px solid transparent"
            color="#03A438"
          >
            {(buttonText && buttonText[0]) ?? "Cancel"}
          </Button>
          <Button
            disabled={isLoading}
            isLoading={isLoading}
            minW="120px"
            onClick={onConfirm}
          >
            {(buttonText && buttonText[1]) ?? "Confirm"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default Confirmation;
