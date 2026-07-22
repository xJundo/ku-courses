import React, { useState, useEffect } from 'react';

interface CommentEditorProps {
  initialComment: string;
  onSave: (comment: string) => void;
}

export const CommentEditor: React.FC<CommentEditorProps> = ({ initialComment, onSave }) => {
  const [val, setVal] = useState(initialComment);

  useEffect(() => {
    setVal(initialComment);
  }, [initialComment]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setVal(text);
    onSave(text);
  };

  return (
    <textarea
      value={val}
      onChange={handleChange}
      placeholder="Ajoutez vos remarques, avis d'anciens étudiants, ou notes personnelles sur ce cours..."
      className="w-full bg-zinc-950 text-xs p-3 rounded-2xl border border-zinc-800 text-zinc-100 focus:outline-none focus:border-violet-500 h-28 resize-none leading-relaxed"
    />
  );
};
