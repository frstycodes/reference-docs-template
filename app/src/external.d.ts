/**
 * An external directory holds ONE document, so it carries only that surface's
 * data file: the living document's `doc-data.json`, or the standalone brief's
 * `brief-data.json`. Each entry imports its own, and the entry for the other
 * surface has nothing to resolve.
 *
 * That is not an error worth failing a type check over — it means the other
 * page is not part of this document, which the dev server already expresses by
 * erroring only when someone opens it. This declares the shape so a missing
 * file degrades instead.
 *
 * `unknown` rather than the parsed JSON's inferred type, and deliberately: an
 * external file is input from outside the app. Every one of them goes through
 * zod at the boundary, and a shape inferred from whichever document happened to
 * be selected would be a promise the next document does not keep.
 */
declare module '@external/*.json' {
  const value: unknown
  export default value
}
