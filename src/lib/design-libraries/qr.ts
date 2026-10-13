import { availableTemplates, cardPresets } from "../design";

const metadata = new Map(availableTemplates("qr").map((item) => [item.id, item]));
export const qrTemplateLibrary = cardPresets.filter((preset) => metadata.has(preset.id));
export const qrTemplateMetadata = metadata;
