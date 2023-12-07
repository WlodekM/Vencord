/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { DataStore } from "@api/index";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { DeleteIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { useForceUpdater } from "@utils/react";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Forms, React, TextInput, useState } from "@webpack/common";
import Seed from "./seed";

const STRING_RULES_KEY = "TextReplace_rulesString";
const REGEX_RULES_KEY = "TextReplace_rulesRegex";

type Rule = Record<"find" | "replace" | "onlyIfIncludes", string>;

interface TextReplaceProps {
    title: string;
    rulesArray: string[];
    rulesKey: string;
    update: () => void;
}

const makeEmptyRule: () => string = () => ("");
const makeEmptyRuleArray = () => [makeEmptyRule()];

let stringRules = makeEmptyRuleArray();
let regexRules = makeEmptyRuleArray();

const settings = definePluginSettings({
    replace: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => {
            const update = useForceUpdater();
            return (
                <>
                    <TextReplace
                        title="Using String"
                        rulesArray={stringRules}
                        rulesKey={STRING_RULES_KEY}
                        update={update}
                    />
                    <TextReplaceTesting />
                </>
            );
        }
    },
});

function stringToRegex(str: string) {
    const match = str.match(/^(\/)?(.+?)(?:\/([gimsuy]*))?$/); // Regex to match regex
    return match
        ? new RegExp(
            match[2], // Pattern
            match[3]
                ?.split("") // Remove duplicate flags
                .filter((char, pos, flagArr) => flagArr.indexOf(char) === pos)
                .join("")
            ?? "g"
        )
        : new RegExp(str); // Not a regex, return string
}

function renderFindError(find: string) {
    try {
        stringToRegex(find);
        return null;
    } catch (e) {
        return (
            <span style={{ color: "var(--text-danger)" }}>
                {String(e)}
            </span>
        );
    }
}

function Input({ initialValue, onChange, placeholder }: {
    placeholder: string;
    initialValue: string;
    onChange(value: string): void;
}) {
    const [value, setValue] = useState(initialValue);
    return (
        <TextInput
            placeholder={placeholder}
            value={value}
            onChange={setValue}
            spellCheck={false}
            onBlur={() => value !== initialValue && onChange(value)}
        />
    );
}

function TextReplace({ title, rulesArray, rulesKey, update }: TextReplaceProps) {
    const isRegexRules = title === "Using Regex";

    async function onClickRemove(index: number) {
        if (index === rulesArray.length - 1) return;
        rulesArray.splice(index, 1);

        await DataStore.set(rulesKey, rulesArray);
        update();
    }

    async function onChange(e: string, index: number) {
        if (index === rulesArray.length - 1)
            rulesArray.push(makeEmptyRule());

        rulesArray[index] = e;

        if (rulesArray[index] === "")
            rulesArray.splice(index, 1);

        await DataStore.set(rulesKey, rulesArray);
        update();
    }

    return (
        <>
            <Forms.FormTitle tag="h4">{title}</Forms.FormTitle>
            <Flex flexDirection="column" style={{ gap: "0.5em" }}>
                {
                    rulesArray.map((rule, index) =>
                        <React.Fragment key={`${rule}-${index}`}>
                            <Flex flexDirection="row" style={{ gap: 0 }}>
                                <Flex flexDirection="row" style={{ flexGrow: 1, gap: "0.5em" }}>
                                    <Input
                                        placeholder="Exception"
                                        initialValue={rule}
                                        onChange={e => onChange(e, index)}
                                    />
                                </Flex>
                                <Button
                                    size={Button.Sizes.MIN}
                                    onClick={() => onClickRemove(index)}
                                    style={{
                                        background: "none",
                                        color: "var(--status-danger)",
                                        ...(index === rulesArray.length - 1
                                            ? {
                                                visibility: "hidden",
                                                pointerEvents: "none"
                                            }
                                            : {}
                                        )
                                    }}
                                >
                                    <DeleteIcon />
                                </Button>
                            </Flex>
                            {isRegexRules && renderFindError(rule)}
                        </React.Fragment>
                    )
                }
            </Flex>
        </>
    );
}

function TextReplaceTesting() {
    const [value, setValue] = useState("");
    return (
        <>
            <Forms.FormTitle tag="h4">Test Rules</Forms.FormTitle>
            <TextInput placeholder="Type a message" onChange={setValue} />
            <TextInput placeholder="Message with rules applied" editable={false} value={applyRules(value)} />
        </>
    );
}

const faces: string[] = [
    "(・`ω´・)",
    ";;w;;",
    "OwO",
    "UwU",
    ">w<",
    "^w^",
    "ÚwÚ",
    "^-^",
    ":3",
    "x3",
];
const exclamations: string[] = ["!?", "?!!", "?!?1", "!!11", "?!?!"];
const actions: string[] = [
    "*blushes*",
    "*whispers to self*",
    "*cries*",
    "*screams*",
    "*sweats*",
    "*twerks*",
    "*runs away*",
    "*screeches*",
    "*walks away*",
    "*sees bulge*",
    "*looks at you*",
    "*notices buldge*",
    "*starts twerking*",
    "*huggles tightly*",
    "*boops your nose*",
];
const uwuMap = [
    [/(?:r|l)/g, "w"],
    [/(?:R|L)/g, "W"],
    [/n([aeiou])/g, "ny$1"],
    [/N([aeiou])/g, "Ny$1"],
    [/N([AEIOU])/g, "Ny$1"],
    [/ove/g, "uv"],
];

let _spacesModifier: SpacesModifier;
let _wordsModifier: number;
let _exclamationsModifier: number;
export function isAt(value: string): boolean {
    // Check if the first character is '@'
    const first = value.charAt(0);
    return first === "@";
}
export function isUri(value: string): boolean {
    if (!value) return false;

    // Check for illegal characters
    if (
        /[^a-z0-9\:\/\?\#\[\]\@\!\$\&\'\(\)\*\+\,\;\=\.\-\_\~\%]/i.test(value)
    ) {
        return false;
    }

    // Check for hex escapes that aren't complete
    if (
        /%[^0-9a-f]/i.test(value) || /%[0-9a-f](:?[^0-9a-f]|$)/i.test(value)
    ) {
        return false;
    }

    // Directly from RFC 3986
    const split = value.match(
        /(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?/,
    );

    if (!split) return false;

    const [, scheme, authority, path] = split;

    // Scheme and path are required, though the path can be empty
    if (!(scheme && scheme.length && path.length >= 0)) return false;

    // If authority is present, the path must be empty or begin with a /
    if (authority && authority.length) {
        if (!(path.length === 0 || /^\//.test(path))) return false;
    } else if (/^\/\//.test(path)) {
        // If authority is not present, the path must not start with //
        return false;
    }

    // Scheme must begin with a letter, then consist of letters, digits, +, ., or -
    if (!/^[a-z][a-z0-9\+\-\.]*$/.test(scheme.toLowerCase())) return false;

    return true;
}

interface SpacesModifier {
    faces: number;
    actions: number;
    stutters: number;
}

function uwuifyExclamations(sentence: string): string {
    const words = sentence.split(" ");
    const pattern = new RegExp("[?!]+$");

    const uwuifiedSentence = words.map((word) => {
        const seed = new Seed(word);

        // If there are no exclamations return
        if (
            !pattern.test(word) || seed.random() > _exclamationsModifier
        ) {
            return word;
        }

        word = word.replace(pattern, "");
        word +=
            exclamations[seed.randomInt(0, exclamations.length - 1)];

        return word;
    }).join(" ");

    return uwuifiedSentence;
}
function uwuifyWords(sentence: string): string {
    const words = sentence.split(" ");

    const uwuifiedSentence = words.map((word) => {
        if (isAt(word)) return word;
        if (isUri(word)) return word;

        const seed = new Seed(word);

        for (const [oldWord, newWord] of uwuMap) {
            // Generate a random value for every map so words will be partly uwuified instead of not at all
            if (seed.random() > _wordsModifier) continue;

            word = word.replace(oldWord, newWord as string);
        }

        return word;
    }).join(" ");

    return uwuifiedSentence;
}
function uwuifySentence(sentence: string): string {
    let uwuifiedString = sentence;

    uwuifiedString = uwuifyWords(uwuifiedString);
    uwuifiedString = uwuifyExclamations(uwuifiedString);

    return uwuifiedString;
}

function applyRules(content: string): string {
    if (content.length === 0)
        return content;

    if (stringRules) {
        const edgeCases = ["lmao", "will", "lol"];
        edgeCases.forEach((edgeCase, i) => {
            // if (!rule.find || !rule.replace) continue;
            content = ` ${content} `.replaceAll(edgeCase, `[$ec#${i}$]`).replace(/^\s|\s$/g, "");
        });

        content = uwuifySentence(content);

        edgeCases.forEach((edgeCase, i) => {
            // if (!rule.find || !rule.replace) continue;
            content = ` ${content} `.replaceAll(`[$ec#${i}$]`, edgeCase).replace(/^\s|\s$/g, "");
        });
    }

    content = content.trim();
    return content;
}

const TEXT_REPLACE_RULES_CHANNEL_ID = "1102784112584040479";

export default definePlugin({
    name: "UwU-ify",
    description: "UwU-ifies your messages wike this :3",
    authors: [Devs.AutumnVN, Devs.TheKodeToad],
    dependencies: ["MessageEventsAPI"],

    settings,

    async start() {
        stringRules = await DataStore.get(STRING_RULES_KEY) ?? makeEmptyRuleArray();
        regexRules = await DataStore.get(REGEX_RULES_KEY) ?? makeEmptyRuleArray();

        this.preSend = addPreSendListener((channelId, msg) => {
            // Channel used for sharing rules, applying rules here would be messy
            if (channelId === TEXT_REPLACE_RULES_CHANNEL_ID) return;
            msg.content = applyRules(msg.content);
        });
    },

    stop() {
        removePreSendListener(this.preSend);
    }
});
