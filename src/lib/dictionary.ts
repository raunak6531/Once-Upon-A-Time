export interface DictionaryDefinition {
  word: string;
  phonetic?: string;
  phonetics: { text?: string; audio?: string }[];
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      example?: string;
      synonyms: string[];
      antonyms: string[];
    }[];
  }[];
}

export async function fetchDefinition(word: string): Promise<DictionaryDefinition | null> {
  const cleanWord = word.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
  if (!cleanWord) return null;

  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
    if (!response.ok) return null;
    const data = await response.ok ? await response.json() : null;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Dictionary API error:", error);
    return null;
  }
}
