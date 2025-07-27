import React from 'react';
import { X, Volume2, Loader2 } from 'lucide-react';
import { SupportedLanguage, getTranslation } from '../constants/translations';

interface WordExample {
  sentence: string;
  transliteration: string;
  translation: string;
}

interface WordInflection {
  form: string;
  transliteration: string;
  translation: string;
}

interface WordExplanationData {
  meaning: string;
  examples: WordExample[];
  inflections: WordInflection[];
}

interface WordExplanationModalProps {
  word: string;
  targetLanguage: SupportedLanguage;
  motherLanguage: SupportedLanguage;
  explanationData: WordExplanationData | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onPlaySound: (word: string) => void;
}

const WordExplanationModal: React.FC<WordExplanationModalProps> = ({
  word,
  targetLanguage,
  motherLanguage,
  explanationData,
  isLoading,
  error,
  onClose,
  onPlaySound
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full h-[400px] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">{word}</h2>
            <button
              onClick={() => onPlaySound(word)}
              className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors"
              title="Play pronunciation"
            >
              <Volume2 size={20} />
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <span className="ml-3 text-gray-600">{getTranslation(motherLanguage, 'loadingExplanation')}</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700">{error}</p>
              <p className="text-sm text-red-600 mt-2">
                {getTranslation(motherLanguage, 'tryAgainOrSearch')}
              </p>
            </div>
          )}

          {explanationData && !isLoading && !error && (
            <div className="space-y-6">
              {/* Meaning */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{getTranslation(motherLanguage, 'meaningAndUsage')}</h3>
                <p className="text-gray-700 leading-relaxed">{explanationData.meaning}</p>
              </div>

              {/* Examples */}
              {explanationData.examples.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">{getTranslation(motherLanguage, 'examples')}</h3>
                  <div className="space-y-3">
                    {explanationData.examples.map((example, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4">
                        <p className="font-medium text-gray-900 mb-1">{example.sentence}</p>
                        <p className="text-gray-500 text-sm mb-1 italic">{example.transliteration}</p>
                        <p className="text-gray-600 italic">{example.translation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inflections */}
              {explanationData.inflections.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">{getTranslation(motherLanguage, 'otherForms')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {explanationData.inflections.map((inflection, index) => (
                      <div key={index} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <p className="font-medium text-blue-900">{inflection.form}</p>
                        <p className="text-blue-600 text-sm italic">{inflection.transliteration}</p>
                        <p className="text-blue-700 text-sm">{inflection.translation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-2xl">
          <p className="text-sm text-gray-600 text-center">
            {getTranslation(motherLanguage, 'aiExplanationWarning')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WordExplanationModal; 