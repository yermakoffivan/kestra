import {describe, expect, it} from "vitest"
import {dirname, resolve} from "node:path"
import {fileURLToPath} from "node:url"

import en from "../../../src/translations/en.json"
import designSystemEn from "../../../packages/design-system/src/translations/en.json"
import {findUnresolvedTableColumnKeys, mergeMessages} from "./tableColumnGuard"

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), "../../../src")

describe("table column descriptions", () => {
    it("resolves every filter.table_column.* key referenced in ui/src", () => {
        // The column-picker descriptions live in the design system's own messages, which
        // `registerDesignSystemI18n` merges into the app messages at bootstrap.
        const messages = mergeMessages({...en.en}, designSystemEn.en)

        const unresolved = findUnresolvedTableColumnKeys(SRC, messages)

        expect(
            unresolved,
            `Add the missing English descriptions to ui/packages/design-system/src/translations/en.json, then run \`npm run translations:generate\`:\n${unresolved.join("\n")}`,
        ).toEqual([])
    })
})
