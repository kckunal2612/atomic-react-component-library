import React from "react";
import styled from "styled-components";

const StyledButton = styled.button`
  /* Add your styling here */
`;

interface ButtonProps {
  // Add any props you want for your Button component
}

const Button: React.FC<ButtonProps> = ({ children, ...props }) => {
  return <StyledButton {...props}>{children}</StyledButton>;
};

export { Button };
