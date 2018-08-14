// Type definitions for JSONEDITOR v
// Project: Types/jsoneditor
// Definitions by: Tingkai Liu

/// <reference types="ace" />

export = JSONEditor;

declare class JSONEditor {
  constructor(container: HTMLElement, options?: JSONEditor.JSONEditorOptions, json?: object);

  destroy(): void;
  set(json: object | undefined): void;
  get(): object;
  setText(jsonText: string | undefined): void;
  getText(): string;
  setName(name: string | undefined): void;
  setName(): string | undefined;

  /**
   * Change the mode of the editor.
   * JSONEditor will be extended with all methods needed for the chosen mode.
   * @param {String} mode     Available modes: 'tree' (default), 'view', 'form',
   *                          'text', and 'code'.
   */
  setMode(mode: string): void;

  /**
   * Get the current mode
   * @return {string}
   */
  getMode(): string;

  /**
   * Set a JSON schema for validation of the JSON object.
   * To remove the schema, call JSONEditor.setSchema(null)
   * @param {Object | null} schema
   * @param {Object.<string, Object>=} schemaRefs Schemas that are referenced using the `$ref` property from the JSON schema that are set in the `schema` option,
   +  the object structure in the form of `{reference_key: schemaObject}`
  */
  setSchema(schema: object | null, schemaRefs: object): void;

  /**
   * Validate current JSON object against the configured JSON schema
   * Throws an exception when no JSON schema is configured
   */
  validate(): void;

  /**
   * Refresh the rendered contents
   */
  refresh(): void;

  /**
   * Register a plugin with one ore multiple modes for the JSON Editor.
   *
   * A mode is described as an object with properties:
   *
   * - `mode: String`           The name of the mode.
   * - `mixin: Object`          An object containing the mixin functions which
   *                            will be added to the JSONEditor. Must contain functions
   *                            create, get, getText, set, and setText. May have
   *                            additional functions.
   *                            When the JSONEditor switches to a mixin, all mixin
   *                            functions are added to the JSONEditor, and then
   *                            the function `create(container, options)` is executed.
   * - `data: 'text' | 'json'`  The type of data that will be used to load the mixin.
   * - `[load: function]`       An optional function called after the mixin
   *                            has been loaded.
   *
   * @param {Object | Array} mode  A mode object or an array with multiple mode objects.
   */
  static registerMode(mode: object | Array<object>): void;

}

/*~ If you want to expose types from your module as well, you can
*~ place them in this block.
*/
declare namespace JSONEditor {
  export interface JSONEditorOptions {
    /** 
     * Editor mode.
     */
    mode?: 'tree' | 'view' | 'form' | 'text' | 'code';

    /**
     * on change of contents
     */
    onChange?: () => void;

    /** 
     * when an error occurs
     */
    onError?: () => void;

    /** 
     * Enable search box.
     * 
     * `True` by default
     * 
     * Only applicable for modes 'tree', 'view', and 'form'
     */
    search?: boolean;

    /** Enable history (undo/redo).
     * 
     * `True` by default
     * Only applicable for modes 'tree', 'view', and 'form'
     */
    history?: boolean;

    /** 
     * Field name for the root node.
     * 
     * Only applicable for modes 'tree', 'view', and 'form'
     */
    name?: string;

    /** 
     * Number of indentation spaces. 4 by default.
     * 
     * Only applicable for modes 'text' and 'code'
     */
    indentation?: number;

    /** 
     * If true, unicode characters are escaped.
     * 
     * `false` by default.
     */
    escapeUnicode?: boolean;

    /** 
     * If true, object keys are sorted before display.
     * 
     * false by default.
     */
    sortObjectKeys?: boolean;

    /** 
     * triggered on node selection change
     * 
     * Only applicable for modes 'tree', 'view', and 'form'
     */
    onSelectionChange?: () => void;

    /** 
     * triggered on text selection change 
     * 
     * Only applicable for modes text' and 'code'
     */
    onTextSelectionChange?: () => void;
  }
}
