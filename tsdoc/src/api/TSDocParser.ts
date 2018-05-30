import { Character } from '../internal/Character';

import { DocComment, IDocCommentParameters } from './DocComment';
import { TextRange } from './TextRange';
import { ParseError } from './ParseError';

// Internal parser state
enum State {
  // Initial state, looking for "/**"
  Start,
  // Waiting for first star in "/**"
  ExpectOpeningStar1,
  // Waiting for second star in "/**"
  ExpectOpeningStar2,
  // Existing the parser loop
  Done
}

/**
 * The main API for parsing TSDoc comments.
 */
export class TSDocParser {
  public parseRange(range: TextRange): DocComment {
    return new DocComment(this._parseRange(range));
  }

  public parseString(text: string): DocComment {
    return this.parseRange(TextRange.fromString(text));
  }

  private _parseRange(range: TextRange): IDocCommentParameters {
    const parameters: IDocCommentParameters = {
      sourceRange: range,
      commentRange: TextRange.empty,
      lines: [],
      parseErrors: []
    };

    let current: number = range.pos;

    let state: State = State.Start;

    let commentRangeStart: number = 0;
    let commentRangeEnd: number = 0;

    const buffer: string = range.buffer;

    while (state !== State.Done) {
      if (current > range.end) {
        parameters.parseErrors.push(
          new ParseError('Expecting a leading "/**"', range.getNewRange(current, 1))
        );
        return parameters;
      }

      const c: string = buffer[current];

      switch (state) {
        case State.Start:
          if (c === '/') {
            state = State.ExpectOpeningStar1;
          } else if (!Character.isWhitespace(c)) {
            parameters.parseErrors.push(
              new ParseError('Expecting a leading "/**"', range.getNewRange(current, 1))
            );
            return parameters;
          }
          commentRangeStart = current;
          ++current;
          break;
        case State.ExpectOpeningStar1:
          if (c !== '*') {
            parameters.parseErrors.push(
              new ParseError('Expecting a leading "/**"', range.getNewRange(current, 1))
            );
            return parameters;
          }
          state = State.ExpectOpeningStar2;
          ++current;
          break;
        case State.ExpectOpeningStar2:
          if (c !== '*') {
            parameters.parseErrors.push(
              // We can relax this later
              new ParseError('Expecting a "/**" comment instead of "/*"', range.getNewRange(current, 1))
            );
            return parameters;
          }
          commentRangeEnd = current + 1;
          state = State.Done;
          ++current;
          break;
      }
    }

    parameters.commentRange = range.getNewRange(commentRangeStart, commentRangeEnd);

    return parameters;
  }
}