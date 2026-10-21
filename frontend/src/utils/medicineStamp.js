function colorFromMedicineName(value) {
  const name = String(value || "medicine").trim().toLowerCase();
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }

  const hue = hash % 360;
  const saturation = 68;
  const lightness = 36;
  const chroma = (1 - Math.abs((2 * lightness) / 100 - 1)) * (saturation / 100);
  const hueSection = hue / 60;
  const secondComponent = chroma * (1 - Math.abs((hueSection % 2) - 1));
  const [red, green, blue] =
    hueSection < 1
      ? [chroma, secondComponent, 0]
      : hueSection < 2
        ? [secondComponent, chroma, 0]
        : hueSection < 3
          ? [0, chroma, secondComponent]
          : hueSection < 4
            ? [0, secondComponent, chroma]
            : hueSection < 5
              ? [secondComponent, 0, chroma]
              : [chroma, 0, secondComponent];
  const match = lightness / 100 - chroma / 2;
  const toHex = (channel) =>
    Math.round((channel + match) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

export function getMedicineStampColor({ category, productCategory, medicineName } = {}) {
  const identity = medicineName || category || productCategory;
  return colorFromMedicineName(identity);
}
