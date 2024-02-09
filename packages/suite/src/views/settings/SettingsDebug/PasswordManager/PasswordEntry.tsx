import React, { useState } from 'react';
import styled from 'styled-components';
import TrezorConnect from '@trezor/connect';
import { Button } from '@trezor/components';

import * as metadataUtils from 'src/utils/suite/metadata';
import type { PasswordEntry as PasswordEntryType } from 'src/types/suite/metadata';
import { PATH } from 'src/actions/suite/constants/metadataPasswordsConstants';

import { EntryForm } from './EntryForm';

const PasswordEntryRow = styled.div`
    margin-bottom: 4px;
`;

const PasswordEntryBody = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    margin-left: 8px;
`;

const PasswordEntryTitle = styled.div`
    font-size: 14px;
`;

const PasswordEntryUsername = styled.div`
    font-size: 14px;
`;

const PasswordEntryPassword = styled.div`
    font-size: 14px;
`;

const Decoded = styled.div`
    display: flex;
    flex-direction: row;
    gap: 4px;
`;

interface PasswordEntryProps extends PasswordEntryType {
    devicePath: string;
    onEncrypted: (entry: PasswordEntryType) => void;
    formActive: undefined | number;
    setFormActive: (id: number) => void;
    index: number;
}

const getDisplayKey = (title: string, username: string) =>
    // todo: implement this for the other category too: https://github.com/trezor/trezor-password-manager/blob/6266f685226bc5d5e0d8c7f08490b282f64ad1d1/source/background/classes/trezor_mgmt.js#L389-L390
    `Unlock ${title} for user ${username}?`;

export const PasswordEntry = ({
    username,
    title,
    nonce,
    password,
    safe_note,
    devicePath,
    onEncrypted,
    formActive,
    setFormActive,
    index,
}: PasswordEntryProps) => {
    const [decryptedPassword, setDecryptedPassword] = useState('');
    const [decryptedSafeNote, setDecryptedSafeNote] = useState('');
    const [inProgress, setInProgress] = useState(false);
    const decrypt = () => {
        if (inProgress) return;
        setInProgress(true);
        TrezorConnect.cipherKeyValue({
            device: { path: devicePath },
            override: true,
            useEmptyPassphrase: true,
            path: PATH,
            key: getDisplayKey(title, username),
            value: nonce,
            encrypt: false,
            askOnEncrypt: false,
            askOnDecrypt: true,
        })
            .then(result => {
                if (result.success) {
                    const decryptedPassword = metadataUtils.decrypt(
                        Buffer.from(password.data),
                        Buffer.from(result.payload.value, 'hex'),
                    );

                    setDecryptedPassword(decryptedPassword);

                    if (safe_note) {
                        const decryptedSafeNote = metadataUtils.decrypt(
                            Buffer.from(safe_note.data),
                            Buffer.from(result.payload.value, 'hex'),
                        );
                        setDecryptedSafeNote(decryptedSafeNote);
                    }
                }
            })
            .finally(() => {
                setInProgress(false);
            });
    };

    return (
        <>
            <PasswordEntryRow>
                <PasswordEntryBody>
                    <PasswordEntryTitle>{title}</PasswordEntryTitle>
                    <PasswordEntryUsername>{username}</PasswordEntryUsername>
                    <PasswordEntryPassword>{decryptedSafeNote}</PasswordEntryPassword>
                    <PasswordEntryPassword>
                        {!decryptedPassword ? (
                            <Button size="tiny" onClick={decrypt} type="button" variant="tertiary">
                                {inProgress ? '....' : 'decode'}
                            </Button>
                        ) : (
                            <Decoded>
                                {decryptedPassword}
                                <Button
                                    size="tiny"
                                    onClick={() => setFormActive(index)}
                                    type="button"
                                    variant="tertiary"
                                    icon="PENCIL"
                                >
                                    Edit
                                </Button>
                            </Decoded>
                        )}
                    </PasswordEntryPassword>
                </PasswordEntryBody>
            </PasswordEntryRow>
            {formActive === index && (
                <EntryForm
                    onEncrypted={args => {
                        onEncrypted(args);
                        setDecryptedPassword('');
                        setDecryptedSafeNote('');
                    }}
                    entry={{
                        title,
                        username,
                        password: decryptedPassword,
                        note: decryptedSafeNote,
                        tags: [],
                        safe_note: decryptedSafeNote,
                    }}
                />
            )}
        </>
    );
};
