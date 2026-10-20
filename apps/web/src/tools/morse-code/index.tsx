import {
  decodeMorse,
  encodeMorse,
  MorseError,
  type MorseTiming,
  morseToTimings,
  WORD_SEPARATOR,
} from '@omnitool/tool-core';
import { PlayIcon, SquareIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { OutputActions } from '@/components/output-actions';
import { TextArea } from '@/components/text-area';
import { ToolFrame, ToolHint, ToolStage } from '@/components/tool-frame';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { requireTool } from '@/lib/tool';

type Mode = 'encode' | 'decode';

const DEFAULT_WPM = 20;

export default function MorseCodeTool() {
  const tool = requireTool('morse-code');
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');
  const [wpm, setWpm] = useState(String(DEFAULT_WPM));
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);

  const result = useMemo(() => {
    if (input.trim() === '') return { text: '', unknown: [] as readonly string[] };
    try {
      return mode === 'encode' ? encodeMorse(input) : decodeMorse(input);
    } catch (cause) {
      return {
        text: '',
        unknown: [cause instanceof MorseError ? cause.message : 'That could not be converted'],
      };
    }
  }, [input, mode]);

  const wordsPerMinute = Number(wpm);

  function stopPlayback() {
    stopRef.current?.();
  }

  useEffect(() => {
    return () => stopRef.current?.();
  }, []);

  function play() {
    stopPlayback();
    let timings: MorseTiming[];
    try {
      timings = morseToTimings(morseText, wordsPerMinute);
    } catch {
      // The speed field reports its own validation; nothing to play otherwise.
      return;
    }
    if (timings.length === 0) return;

    const context = new AudioContext();
    const oscillators: OscillatorNode[] = [];
    let now = context.currentTime;
    for (const part of timings) {
      const seconds = part.durationMs / 1000;
      if (part.tone) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = 600;
        // Short ramps at each edge keep the beeps free of clicks.
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.005);
        gain.gain.setValueAtTime(0.2, now + seconds - 0.005);
        gain.gain.linearRampToValueAtTime(0, now + seconds);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + seconds);
        oscillators.push(oscillator);
      }
      now += seconds;
    }

    const totalMs = timings.reduce((sum, part) => sum + part.durationMs, 0);
    const timer = window.setTimeout(() => {
      void context.close();
      stopRef.current = null;
      setPlaying(false);
    }, totalMs + 100);

    stopRef.current = () => {
      window.clearTimeout(timer);
      for (const oscillator of oscillators) {
        try {
          oscillator.stop();
        } catch {
          // Already stopped and closed with its context.
        }
      }
      void context.close();
      stopRef.current = null;
      setPlaying(false);
    };
    setPlaying(true);
  }

  function reset() {
    stopPlayback();
    setMode('encode');
    setInput('');
    setWpm(String(DEFAULT_WPM));
  }

  const wpmError =
    Number.isFinite(wordsPerMinute) && wordsPerMinute >= 1 && wordsPerMinute <= 60
      ? null
      : 'Words per minute must be between 1 and 60';

  /** The Morse to play is the output when encoding, the input when decoding. */
  const morseText = mode === 'encode' ? result.text : input.trim();

  return (
    <ToolFrame
      tool={tool}
      onReset={reset}
      actions={
        <OutputActions
          text={result.text}
          filename={mode === 'encode' ? 'morse-code.txt' : 'decoded-text.txt'}
          disabled={result.text === ''}
        />
      }
    >
      <ToolStage title={mode === 'encode' ? 'Text' : 'Morse'}>
        <div className="max-w-xs">
          <Label htmlFor="morse-mode">Direction</Label>
          <Select
            value={mode}
            onValueChange={(next) => {
              setMode(next as Mode);
              setInput('');
            }}
          >
            <SelectTrigger id="morse-mode" className="mt-2 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="encode">Text to Morse</SelectItem>
              <SelectItem value="decode">Morse to text</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4">
          <Label htmlFor="morse-input">
            {mode === 'encode' ? 'Text to encode' : 'Morse to decode'}
          </Label>
          <TextArea
            id="morse-input"
            className="mt-2"
            rows={6}
            value={input}
            spellCheck={false}
            placeholder={
              mode === 'encode'
                ? 'Type or paste text; the code appears as you go.'
                : 'Paste dots and dashes; letters separated by spaces, words by a slash.'
            }
            onChange={(event) => setInput(event.target.value)}
          />
        </div>
        <ToolHint>
          {mode === 'encode' ? (
            <>
              ITU Morse for letters and digits, plus common punctuation. Letters within a word are
              separated by one space, words by a slash ({WORD_SEPARATOR}).
            </>
          ) : (
            <>
              Letters are separated by single spaces; words by a slash ({WORD_SEPARATOR}) or by
              three spaces.
            </>
          )}
        </ToolHint>
      </ToolStage>

      <ToolStage title={mode === 'encode' ? 'Morse' : 'Text'}>
        {result.unknown.length > 0 && mode === 'encode' ? (
          <p role="alert" className="mb-3 text-sm text-destructive">
            No Morse sign for: {result.unknown.join(', ')}. They were left out.
          </p>
        ) : null}
        {result.unknown.length > 0 && mode === 'decode' ? (
          <p role="alert" className="mb-3 text-sm text-destructive">
            Unknown Morse {result.unknown.length === 1 ? 'sign' : 'signs'}:{' '}
            {result.unknown.join(', ')}. They show as question marks.
          </p>
        ) : null}
        <Label htmlFor="morse-output">{mode === 'encode' ? 'Morse code' : 'Decoded text'}</Label>
        <TextArea
          id="morse-output"
          className="mt-2 font-mono"
          rows={6}
          readOnly
          value={result.text}
        />
      </ToolStage>

      <ToolStage title="Playback">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-40">
            <Label htmlFor="morse-wpm">Words per minute</Label>
            <Input
              id="morse-wpm"
              className="mt-2"
              type="number"
              min={1}
              max={60}
              value={wpm}
              onChange={(event) => setWpm(event.target.value)}
            />
          </div>
          {playing ? (
            <Button type="button" onClick={stopPlayback}>
              <SquareIcon aria-hidden="true" className="size-4" />
              Stop
            </Button>
          ) : (
            <Button type="button" onClick={play} disabled={morseText === '' || wpmError !== null}>
              <PlayIcon aria-hidden="true" className="size-4" />
              Play
            </Button>
          )}
        </div>
        {wpmError ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {wpmError}
          </p>
        ) : null}
        <ToolHint>
          {mode === 'decode'
            ? 'The beeps play the Morse you pasted, at the standard timing: a dot one unit, a dash three, three units between letters and seven between words.'
            : 'The beeps use a 600 Hz tone at the standard timing: a dot one unit, a dash three, three units between letters and seven between words.'}
        </ToolHint>
      </ToolStage>
    </ToolFrame>
  );
}
