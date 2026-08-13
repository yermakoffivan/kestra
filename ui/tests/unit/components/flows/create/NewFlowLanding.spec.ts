import {describe, test, expect, vi, beforeEach} from "vitest"
import {mount} from "@vue/test-utils"
import {createI18n} from "vue-i18n"
import {createPinia} from "pinia"
import {RouterLinkStub} from "@vue/test-utils"

const route = {params: {} as Record<string, string>, query: {} as Record<string, string>}

vi.mock("vue-router", () => ({
    useRoute: () => route,
    RouterLink: RouterLinkStub,
}))

vi.mock("override/stores/misc", () => ({
    useMiscStore: () => ({configs: {systemNamespace: "kestra.system"}}),
}))

vi.mock("../../../../../src/composables/useNamespaces", () => ({
    default: () => ({all: vi.fn().mockResolvedValue([{id: "company.team"}, {id: "dev"}])}),
    defaultNamespace: () => undefined,
}))

const messages = {
    en: {
        "new_flow_landing.title": "Create a new flow",
        "new_flow_landing.subtitle": "Start from a blank canvas, explore blueprints, or import an existing YAML.",
        "new_flow_landing.blank.title": "Blank flow",
        "new_flow_landing.blank.subtitle": "Start with a hello-world starter and build from scratch.",
        "new_flow_landing.blank.id_label": "Flow id",
        "new_flow_landing.blank.id_placeholder": "e.g. my-flow",
        "new_flow_landing.blank.namespace_placeholder": "Select a namespace",
        "new_flow_landing.blank.open_editor": "Open editor",
        "new_flow_landing.blank.required_hint": "Enter a flow id and select a namespace to open the editor.",
        "new_flow_landing.blank.namespaces_error": "Could not load namespaces.",
        "new_flow_landing.blank.id_invalid": "Invalid flow id.",
        "new_flow_landing.blank.namespace_invalid": "Invalid namespace.",
        "new_flow_landing.blueprints.title": "Browse blueprints",
        "new_flow_landing.blueprints.subtitle": "Pick a ready-made flow from the community catalog.",
        "new_flow_landing.system.title": "Create a system flow",
        "new_flow_landing.system.subtitle": "Build an alert or automation flow for your platform.",
        "new_flow_landing.system.badge": "SYSTEM",
        "new_flow_landing.import.title": "Import YAML",
        "new_flow_landing.import.subtitle": "Paste or upload an existing flow definition.",
        namespace: "namespace",
    },
}

const globalConfig = {
    global: {
        plugins: [
            createI18n({legacy: false, locale: "en", messages}),
            createPinia(),
        ],
        stubs: {
            RouterLink: RouterLinkStub,
            KsText: {template: "<span><slot /></span>"},
            KsIcon: {template: "<i><slot /></i>"},
            KsTag: {template: "<span><slot /></span>"},
            KsCard: {template: "<div><slot /></div>"},
            KsAlert: {template: "<div data-stub='ks-alert'><slot /></div>"},
            KsForm: {template: "<form><slot /></form>"},
            KsFormItem: {
                template: "<div><label>{{ label }}<span v-if=\"required\" class='required-mark'>*</span></label><slot /></div>",
                props: {label: String, required: Boolean},
            },
            KsInput: {
                template: "<input :value='modelValue' @input=\"$emit('update:modelValue', $event.target.value)\" />",
                props: ["modelValue"],
                emits: ["update:modelValue"],
            },
            KsSelect: {
                template: "<select :value='modelValue' @change=\"$emit('update:modelValue', $event.target.value)\"><slot /></select>",
                props: ["modelValue"],
                emits: ["update:modelValue"],
            },
            KsOption: {template: "<option :value='value'>{{label}}</option>", props: ["value", "label"]},
            KsButton: {
                template: "<button :disabled='disabled' @click=\"$emit('click')\"><slot /></button>",
                props: ["disabled"],
                emits: ["click"],
            },
        },
    },
}

import NewFlowLanding from "../../../../../src/components/flows/create/NewFlowLanding.vue"

describe("NewFlowLanding", () => {
    beforeEach(() => {
        route.params = {}
        route.query = {}
    })

    test("preselects the namespace carried by the create link", () => {
        // Given — "Create flow" from a namespace page navigates with ?namespace=
        route.query = {namespace: "company.analytics"}

        // When
        const wrapper = mount(NewFlowLanding, globalConfig)

        // Then — the namespace context is kept instead of forcing the user to pick it again
        const nsSelect = wrapper.find("[data-test='blank-flow-namespace']")
        expect((nsSelect.element as HTMLSelectElement).value).toBe("company.analytics")
        expect(wrapper.findAll("[data-test='blank-flow-namespace'] option").map(o => o.attributes("value")))
            .toContain("company.analytics")
    })

    test("rejects a flow id that the backend would refuse", async () => {
        // Given
        const wrapper = mount(NewFlowLanding, globalConfig)
        await wrapper.find("[data-test='blank-flow-namespace']").setValue("company.team")

        // When — an id containing a YAML-breaking character
        await wrapper.find("[data-test='blank-flow-id']").setValue("my flow: broken")

        // Then
        expect(wrapper.find("[data-test='blank-flow-id-error']").exists()).toBe(true)
        expect((wrapper.find("[data-test='blank-flow-open-editor']").element as HTMLButtonElement).disabled).toBe(true)
        expect(wrapper.emitted("proceed")).toBeFalsy()
    })

    test("rejects an uppercase namespace", async () => {
        // Given — an invalid namespace arriving from the create link
        route.query = {namespace: "Company.Team"}

        // When
        const wrapper = mount(NewFlowLanding, globalConfig)
        await wrapper.find("[data-test='blank-flow-id']").setValue("my-flow")

        // Then
        expect(wrapper.find("[data-test='blank-flow-namespace-error']").exists()).toBe(true)
        expect((wrapper.find("[data-test='blank-flow-open-editor']").element as HTMLButtonElement).disabled).toBe(true)
    })

    test("renders primary blank-flow card and three secondary rows", () => {
        // Given / When
        const wrapper = mount(NewFlowLanding, globalConfig)

        // Then
        expect(wrapper.find("[data-test='blank-flow-card']").exists()).toBe(true)
        expect(wrapper.find("[data-test='browse-blueprints-card']").exists()).toBe(true)
        expect(wrapper.find("[data-test='system-flow-card']").exists()).toBe(true)
        expect(wrapper.find("[data-test='import-yaml-card']").exists()).toBe(true)
    })

    test("Open editor button is disabled when id or namespace is empty", async () => {
        // Given
        const wrapper = mount(NewFlowLanding, globalConfig)

        // Then — no id or namespace filled
        const btn = wrapper.find("[data-test='blank-flow-open-editor']")
        expect((btn.element as HTMLButtonElement).disabled).toBe(true)
    })

    test("marks the flow id and namespace fields as required", () => {
        // Given / When — a disabled button with unmarked fields reads as broken rather than blocked
        const wrapper = mount(NewFlowLanding, globalConfig)

        // Then — both fields carry the required marker
        expect(wrapper.findAll(".required-mark")).toHaveLength(2)
    })

    test("explains what the disabled Open editor button is waiting for", async () => {
        // Given
        const wrapper = mount(NewFlowLanding, globalConfig)
        const hint = () => wrapper.find("[data-test='blank-flow-required-hint']")

        // Then — nothing filled in yet
        expect(hint().text()).toBe("Enter a flow id and select a namespace to open the editor.")

        // When — only the id is filled
        await wrapper.find("[data-test='blank-flow-id']").setValue("my-flow")

        // Then — the namespace is still missing
        expect(hint().text()).toBe("Enter a flow id and select a namespace to open the editor.")

        // When — the namespace is picked too
        await wrapper.find("[data-test='blank-flow-namespace']").setValue("company.team")

        // Then — the button is actionable, so the hint goes away
        expect(hint().text()).toBe("")
        expect((wrapper.find("[data-test='blank-flow-open-editor']").element as HTMLButtonElement).disabled).toBe(false)
    })

    test("keeps the hint mounted as a live region so its content change is announced", () => {
        // Given / When — a region that appears at the same time as its text is not announced
        const wrapper = mount(NewFlowLanding, globalConfig)

        // Then
        expect(wrapper.find("[data-test='blank-flow-required-hint']").attributes("role")).toBe("status")
    })

    test("namespace select lets the user type a namespace that does not exist yet", () => {
        // Given — a fresh instance may have zero namespaces; without allow-create
        // the blank-flow form is a dead end (nothing to select, button stays disabled)
        const wrapper = mount(NewFlowLanding, globalConfig)

        // Then
        const nsSelect = wrapper.find("[data-test='blank-flow-namespace']")
        expect(nsSelect.attributes("allowcreate")).toBeDefined()
        expect(nsSelect.attributes("defaultfirstoption")).toBeDefined()
    })

    test("emits proceed with id and namespace when Open editor is clicked", async () => {
        // Given
        const wrapper = mount(NewFlowLanding, globalConfig)

        // When — fill id and namespace
        const idInput = wrapper.find("[data-test='blank-flow-id']")
        await idInput.setValue("my-flow")

        const nsSelect = wrapper.find("[data-test='blank-flow-namespace']")
        await nsSelect.setValue("company.team")

        // When — click Open editor
        const btn = wrapper.find("[data-test='blank-flow-open-editor']")
        await btn.trigger("click")

        // Then
        expect(wrapper.emitted("proceed")).toBeTruthy()
        const [payload] = wrapper.emitted("proceed")![0] as [{id: string; namespace: string}]
        expect(payload.id).toBe("my-flow")
        expect(payload.namespace).toBe("company.team")
    })

    test("Browse blueprints is a router-link to the blueprints route", () => {
        // Given
        const wrapper = mount(NewFlowLanding, globalConfig)

        // Then — findAllComponents returns VueWrapper, filter by data-test attribute
        const links = wrapper.findAllComponents(RouterLinkStub)
        const link = links.find(l => l.attributes("data-test") === "browse-blueprints-card")
        expect(link).toBeDefined()
        const to = link!.props("to") as {name: string}
        expect(to.name).toBe("blueprints")
    })

    test("Create a system flow is a router-link pointing to the configured system namespace", () => {
        // Given
        const wrapper = mount(NewFlowLanding, globalConfig)

        // Then — must use the config value, not a hardcoded 'system' literal
        const links = wrapper.findAllComponents(RouterLinkStub)
        const link = links.find(l => l.attributes("data-test") === "system-flow-card")
        expect(link).toBeDefined()
        const to = link!.props("to") as {name: string; params: {id: string}; query: {tab: string}}
        expect(to.name).toBe("namespaces/update")
        expect(to.params.id).toBe("kestra.system")
        expect(to.query.tab).toBe("blueprints")
    })

    test("Import YAML card is a button that emits import event", async () => {
        // Given
        const wrapper = mount(NewFlowLanding, globalConfig)

        // Then — it is a real button
        const btn = wrapper.find("[data-test='import-yaml-card']")
        expect(btn.element.tagName).toBe("BUTTON")

        // When
        await btn.trigger("click")

        // Then
        expect(wrapper.emitted("import")).toBeTruthy()
    })

    test("shows namespace error alert when namespaces fail to load", async () => {
        // Given — namespace load fails
        const {vi: _vi} = await import("vitest")
        const config = {
            ...globalConfig,
            global: {
                ...globalConfig.global,
                plugins: [...globalConfig.global.plugins],
            },
        }
        vi.doMock("../../../../../src/composables/useNamespaces", () => ({
            default: () => ({all: vi.fn().mockRejectedValue(new Error("network error"))}),
            defaultNamespace: () => undefined,
        }))
        vi.resetModules()

        const {default: NewFlowLandingFresh} = await import("../../../../../src/components/flows/create/NewFlowLanding.vue")
        const wrapper = mount(NewFlowLandingFresh, config)
        await new Promise(r => setTimeout(r, 10))

        // Then
        expect(wrapper.find("[data-test='namespaces-error']").exists()).toBe(true)
    })
})
