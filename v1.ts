function getProp(obj: Record<string, any>, path: string | string[], defaultValue?: any) {
    const flatPath = Array.isArray(path)
        ? path.flat()
        : path.split('.').filter((k) => k);
    const value = flatPath.reduce((acc, part) => acc?.[part], obj);
    return value ?? defaultValue;
}

function HakureiScript(source: string, sourceName?: string) {
    let src = source
    let cursor = 0
    const vars: Map<string, any> = new Map()
    const conditionalStack: boolean[] = []
    const result: string[] = []

    const skipWS = () => {
        while (cursor < src.length && /\s/.test(src[cursor])) {
            cursor++
        }
    }

    const match = (str: string) => {
        if (src.startsWith(str, cursor)) {
            cursor += str.length
            return true
        }
        return false
    }

    const skipLine = () => {
        while (cursor < src.length && !/\n|\r|\r\n/.test(src[cursor])) {
            cursor++
        }

        if (cursor < src.length) {
            cursor++
        }
    }

    const readUntil = (char: string) => {
        const start = cursor
        while (cursor < src.length && src[cursor] !== char) {
            cursor++
        }
        return src.slice(start, cursor)
    }

    const reset = () => {
        src = source
        cursor = 0
        vars.clear()
        conditionalStack.length = 0
        result.length = 0
    }

    const shouldOutput = () => {
        return conditionalStack.every(Boolean)
    }

    const interpolate = (obj: Record<string, any>, text: string) => {
        return text.replace(/\{{([^{}]+)\}}/g, (_, key) => {
            if (vars.has(key)) {
                return vars.get(key)
            }

            // throw error if no prop

            return getProp(obj, key)
        })
    }

    const evaluateCondition = (obj: Record<string, any>, condition: string) => {
        const operators = ['>', '<', '>=', '<=', '==', '!=', '&&', '||', '!']
        let expr = condition

        for (const op of operators) {
            const parts = expr.split(op);
            if (parts.length === 2) {
                const left = getProp(obj, parts[0].trim());
                const right = vars.get(parts[1].trim()) || getProp(obj, parts[1].trim()) || (Number(parts[1].trim()) || parts[1].trim())

                switch (op) {
                    case '>': return Number(left) > Number(right);
                    case '<': return Number(left) < Number(right);
                    case '>=': return Number(left) >= Number(right);
                    case '<=': return Number(left) <= Number(right);
                    case '==': return left == right;
                    case '!=': return left != right;
                    case '&&': return Boolean(left) && Boolean(right);
                    case '||': return Boolean(left) || Boolean(right);
                }
            }
        }

        return Boolean(getProp(obj, expr))
    }

    const handleVariable = () => {
        skipWS()
        const name = readUntil(' ')
        skipWS()
        const value = readUntil('\n')
        vars.set(name, Number(value) || value)
        cursor++
    }

    const handleConditional = (obj: Record<string, any>) => {
        const condition = readUntil('\n').trim()
        const result = evaluateCondition(obj, condition)
        conditionalStack.push(result)
        cursor++
    }

    const handleElseIf = (obj: Record<string, any>) => {
        if (conditionalStack[conditionalStack.length - 1]) {
            conditionalStack.push(false);
        } else {
            const condition = readUntil('\n').trim();
            const result = evaluateCondition(obj, condition);
            conditionalStack[conditionalStack.length - 1] = result;
        }
        cursor++
    }

    const handleElse = () => {
        conditionalStack[conditionalStack.length - 1] = !conditionalStack[conditionalStack.length - 1];
        cursor++
    }

    const handleEndIf = () => {
        conditionalStack.pop()
        cursor++
    }

    const handleText = (obj: Record<string, any>) => {
        const start = cursor
        let inInterpolation = false

        while (cursor < src.length) {
            if (src[cursor] === '{') {
                inInterpolation = true
            } else if (src[cursor] === '}') {
                inInterpolation = false
            } else if (src[cursor] === '@' && !inInterpolation) {
                break;
            } else if (src[cursor] === '\n' && !inInterpolation) {
                cursor++
                break
            }
            cursor++
        }

        const text = src.slice(start, cursor)

        if (shouldOutput()) {
            result.push(interpolate(obj, text))
        }
    }

    return (obj: Record<string, any>) => {
        reset()

        while (cursor < src.length) {
            skipWS()

            if (match('#')) {
                skipLine()
            } else if (match('@var')) {
                handleVariable()
            } else if (match('@if')) {
                handleConditional(obj)
            } else if (match('@elseif')) {
                handleElseIf(obj)
            } else if (match('@else')) {
                handleElse()
            } else if (match('@endif')) {
                handleEndIf()
            } else {
                handleText(obj)
            }
        }

        return result.join('').trim()
    }
}

// tested on Bun 1.1.26
// @ts-expect-error
if (import.meta.main) {
    // @ts-expect-error
    const exampleFile = await (Bun.file('example.hk')).text()
    const HS = HakureiScript(exampleFile)
    const compiled = HS({
        name: 'Reimu Hakurei',
        money: {
            offering_box: 0,
            wallet: 15
        },
        status: {
            hunger: true,
            saving: true
        }
    })

    console.log(compiled)
}