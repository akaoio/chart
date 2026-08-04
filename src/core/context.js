/**
 * How a child finds its chart, in place of `React.createContext`.
 *
 * A consumer fires one event when it connects; the nearest ancestor that serves that
 * role answers by putting itself on the event and stopping it going further. What comes
 * back is the provider **element**, not a snapshot — so the consumer reads live values
 * and calls methods on it, which is what the original context did too.
 *
 * Three approaches were built and measured against ten ways a page really assembles
 * itself (`tools/prototype/composition.mjs`):
 *
 *     bubbling events    10/10
 *     parent assigns on slotchange    8/10   — blind to deep nesting and shadow DOM
 *     global registry by id           9/10   — and its one failure binds to the WRONG
 *                                              chart in silence, which is worse than
 *                                              failing outright
 *
 * Bubbling wins on merit: it follows the composed tree, so "nearest enclosing chart" is
 * answered by the DOM rather than by bookkeeping that can drift out of step with it.
 */

const REQUEST = "chart-context-request"
const PROVIDER_CONNECTED = "chart-context-provider-connected"

/** Answer context requests for `role` addressed to this element or its descendants. */
export const serveContext = (element, role) => {
    element.addEventListener(REQUEST, event => {
        if (event.detail.role !== role || event.target === element) return

        event.stopPropagation()
        event.detail.provider = element
    })

    // A consumer that gave up because it upgraded before its provider gets another go.
    document.dispatchEvent(new CustomEvent(PROVIDER_CONNECTED))
}

/** The nearest ancestor serving `role`, or null. */
export const findContext = (element, role) => {
    const detail = { role, provider: null }
    element.dispatchEvent(new CustomEvent(REQUEST, { detail, bubbles: true, composed: true }))
    return detail.provider
}

/**
 * Ask for context, and if nobody answers, ask again the next time any provider connects.
 *
 * Providers normally connect before their children — that is the order the parser and
 * `append` both use. The exception is a page whose custom element definitions load after
 * its markup, where children can upgrade first. Rather than assume that never happens,
 * a consumer that came up empty listens once and retries.
 *
 * Returns a function that cancels the retry, for the consumer's disconnect path.
 */
export const findContextEventually = (element, role, onFound) => {
    const provider = findContext(element, role)
    if (provider) {
        onFound(provider)
        return () => {}
    }

    const retry = () => {
        if (!element.isConnected) return

        const late = findContext(element, role)
        if (!late) return

        document.removeEventListener(PROVIDER_CONNECTED, retry)
        onFound(late)
    }

    document.addEventListener(PROVIDER_CONNECTED, retry)
    return () => document.removeEventListener(PROVIDER_CONNECTED, retry)
}
