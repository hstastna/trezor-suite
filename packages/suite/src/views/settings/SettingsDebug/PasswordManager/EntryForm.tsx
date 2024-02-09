import React, { useState } from 'react';
import { randomBytes } from 'crypto';
import styled from 'styled-components';

import TrezorConnect from '@trezor/connect';

import { Button, Input } from '@trezor/components';
import type { PasswordEntry, PasswordEntryDecoded } from '@suite-common/metadata-types';

import { useSelector } from 'src/hooks/suite';
import { selectDevice } from '@suite-common/wallet-core';
import * as metadataUtils from 'src/utils/suite/metadata';
import { PATH } from 'src/actions/suite/constants/metadataPasswordsConstants';

const FormWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 16px;
`;
// todo: duplicated
const getDisplayKey = (title: string, username: string) =>
    // todo: implement this for the other category too: https://github.com/trezor/trezor-password-manager/blob/6266f685226bc5d5e0d8c7f08490b282f64ad1d1/source/background/classes/trezor_mgmt.js#L389-L390
    `Unlock ${title} for user ${username}?`;

interface Props {
    onEncrypted: (entry: PasswordEntry) => void;
    entry?: PasswordEntryDecoded;
}

export const EntryForm = ({ onEncrypted, entry }: Props) => {
    const [title, setTitle] = useState<string>(entry?.title || '');
    const [username, setUsername] = useState<string>(entry?.username || '');
    const [password, setPassword] = useState<string>(entry?.password || '');
    const [note, setNote] = useState<string>(entry?.note || '');
    const [secretNote, setSecretNote] = useState<string>(entry?.safe_note || '');

    const [inProgress, setInProgress] = useState(false);

    const device = useSelector(selectDevice);

    const encrypt = () => {
        if (inProgress || !device) return;

        setInProgress(true);
        const nonce = randomBytes(32).toString('hex');
        TrezorConnect.cipherKeyValue({
            device: { path: device.path },
            override: true,
            useEmptyPassphrase: true,
            path: PATH,
            key: getDisplayKey(title, username),
            value: nonce,
            encrypt: true,
            askOnDecrypt: true,
            askOnEncrypt: false,
        })
            .then(result => {
                if (!result.success) {
                    throw new Error(result.payload.error);
                }
                return Promise.all([
                    metadataUtils.encrypt(password, Buffer.from(nonce, 'hex')),
                    metadataUtils.encrypt(secretNote, Buffer.from(nonce, 'hex')),
                    Promise.resolve(result.payload.value),
                ]);
            })
            .then(([encryptedPassword, encryptedSecretNote, nonce2]) => {
                onEncrypted({
                    title,
                    username,
                    password: {
                        type: 'Buffer',
                        data: encryptedPassword,
                    },
                    note,
                    safe_note: {
                        type: 'Buffer',
                        data: encryptedSecretNote,
                    },
                    nonce: nonce2,
                    tags: [],
                    // likely not needed
                    key_value: 'waht is this?',
                    // likely not needed
                    export: false,
                    // likely not needed
                    success: false,
                });
            })
            .catch(error => {
                // todo
                console.error(error);
            })
            .finally(() => {
                setInProgress(false);
            });
    };

    return (
        <FormWrapper>
            <Input
                placeholder="title"
                value={title}
                onChange={event => {
                    setTitle(event.target.value);
                }}
            />
            <Input
                placeholder="username"
                value={username}
                onChange={event => setUsername(event.target.value)}
            />
            <Input
                placeholder="note"
                value={note}
                onChange={event => setNote(event.target.value)}
            />
            <Input
                placeholder="secretNote"
                value={secretNote}
                onChange={event => setSecretNote(event.target.value)}
            />
            <Input
                placeholder="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
            />
            <Button onClick={encrypt}>Submit</Button>
        </FormWrapper>
    );
};
