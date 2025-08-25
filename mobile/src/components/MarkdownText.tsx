import React from "react";
import { Text, TextProps } from "react-native";

export default function MarkdownText({ children, ...props }: TextProps & { children: string }) {
  const renderBold = (text: string) =>
    text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <Text key={i} style={{ fontWeight: "bold" }}>
            {part.slice(2, -2)}
          </Text>
        );
      }
      return part;
    });

  const lines = children.split("\n");

  return (
    <Text {...props}>
      {lines.map((line, i) => {
        if (line.startsWith("### ")) {
          return (
            <Text key={i} style={{ fontWeight: "bold", fontSize: 16 }}>
              {renderBold(line.slice(4))}
              {i < lines.length - 1 ? "\n" : ""}
            </Text>
          );
        }
        return (
          <Text key={i}>
            {renderBold(line)}
            {i < lines.length - 1 ? "\n" : ""}
          </Text>
        );
      })}
    </Text>
  );
}
