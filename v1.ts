enum TokenType {
    Comment = '#',
    Variable = '@var',
    SLO = '{{',
    SLE = '}}',
    IfStatement = '@if',
    ElseIfStatement = '@elseif',
    ElseStatement = '@else',
    EndIfStatement = '@endif'
}

interface HakureiToken {
    type: TokenType
    value?: { name: string, value: string | number }
}

interface HakureiNode {
    type: TokenType
    value?: string | number
    children?: HakureiNode[]
}

function getProp(obj: Record<string, any>, path: string | string[], defaultValue?: any) {
    const flatPath = Array.isArray(path)
        ? path.flat()
        : path.split('.').filter((k) => k);
    const value = flatPath.reduce((acc, part) => acc?.[part], obj);
    return value ?? defaultValue;
}

function hasProp(obj: Record<string, any>, path: string | string[]): boolean {
    return getProp(obj, path) !== undefined;
}

function EnumExists(str: string) {
    return Object.values(TokenType).includes(str as any);
}

function HakureiScript(obj: Record<string, any>, template: string, name?: string) {
    const str = template
    const tokens: HakureiToken[] = []
    let cIndex = 0

    const throwError = (msg: string) => {
        const line = str.slice(0, cIndex).split('\n').length
        const message = `[Hakurei Script] Error: ${msg} at line ${line}. Script: ${name}`
        throw new Error(message)
    }

    const tokenize = () => {
        const regex = /(#.*|\{\{|\}\}|\@if|\@elseif|\@else|\@endif|\@var\s+\w+\s+\w+|\s+)/g
        let m: RegExpExecArray | null

        while ((m = regex.exec(str)) !== null) {
            const rToken = m[0]?.trim()
            if ( rToken.length === 0 ) continue

            const tToken = rToken.split(/\s+/)[0]?.trim()
            if ( !tToken || !EnumExists(tToken) ) {
                throwError(`Invalid token: ${tToken}`)
            }

            const token: HakureiToken = { type: tToken as TokenType }

            if ( tToken === TokenType.Variable ) {
                const [, name, value] = rToken.split(/\s+/)
                token.value = { name, value: Number(value) || value }
            }

            tokens.push(token)
        }
    }

    tokenize()
    console.log(tokens)
}

// @ts-expect-error
if ( import.meta.main ) {
    // @ts-expect-error
    const exampleFile = await (Bun.file('example.hk')).text()
    
    console.log(
        HakureiScript({}, exampleFile)
    )
}