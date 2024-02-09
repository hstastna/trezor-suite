import React, { useState } from 'react';
import styled from 'styled-components';
import { Button } from '@trezor/components';
import { selectDevice } from '@suite-common/wallet-core';

import { SectionItem, TextColumn, ActionColumn } from 'src/components/suite';
import { useSelector, usePasswords } from 'src/hooks/suite';

import { PasswordEntry as PasswordEntryComponent } from './PasswordEntry';
import { Tag } from './Tag';
import { EntryForm } from './EntryForm';
import { AddEntryButton } from './AddEntryButton';

const PasswordManagerBody = styled.div`
    display: flex;
    flex: 1;
    flex-direction: column;
`;

const TagsList = styled.div`
    display: flex;
    flex-direction: row;
    margin-bottom: 8px;
    gap: 4px;
`;

const PasswordsList = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
    flex: 1;
`;

export const PasswordManager = () => {
    const {
        entries,
        entriesByTag,
        tags,
        isSomeTagSelected,
        isAllTagSelected,
        extVersion,
        fileName,
        fetchingPasswords,
        selectedTags,
        setSelectedTags,
        connect,
        disconnect,
        selectedProvider,
        providerConnecting,
        savePasswords,
    } = usePasswords();
    const device = useSelector(selectDevice);

    const [formActive, setFormActive] = useState<undefined | number>();

    const nextId = Object.entries(entries).length + 1;

    if (providerConnecting) {
        return <SectionItem>Connecting...</SectionItem>;
    }

    if (!selectedProvider || !fileName) {
        return (
            <SectionItem>
                <TextColumn
                    title="Trezor password manager"
                    description="Read only implementation of former Trezor Password Manager"
                />
                <ActionColumn>
                    <Button onClick={connect}>Connect to dropbox</Button>
                    {/* TODO: connect to drive */}
                </ActionColumn>
            </SectionItem>
        );
    }

    return (
        <>
            <SectionItem>
                <TextColumn
                    title="Provider details"
                    description={`type: ${selectedProvider.type}, clientId: ${selectedProvider.clientId}, connected user: ${selectedProvider.user}`}
                />
                <ActionColumn>
                    <Button onClick={disconnect}>Disconnect</Button>
                </ActionColumn>
            </SectionItem>
            <SectionItem>
                {fetchingPasswords ? (
                    <div>Fetching passwords...</div>
                ) : (
                    <>
                        {extVersion ? (
                            <PasswordManagerBody>
                                <TagsList>
                                    {Object.entries(tags).map(([key, value]) => (
                                        <Tag
                                            key={key}
                                            title={value.title}
                                            onClick={() => {
                                                setSelectedTags({
                                                    ...selectedTags,
                                                    [key]: !selectedTags[key],
                                                });
                                            }}
                                            isSelected={selectedTags[key]}
                                        />
                                    ))}
                                </TagsList>
                                <PasswordsList>
                                    {(isSomeTagSelected && !isAllTagSelected
                                        ? Object.entries(entriesByTag)
                                        : Object.entries(entries)
                                    ).map(([key, entry]) => (
                                        <PasswordEntryComponent
                                            {...entry}
                                            devicePath={device!.path}
                                            key={key}
                                            index={Number(key)}
                                            // todo: on edited
                                            onEncrypted={entry => {
                                                savePasswords(Number(key), entry);
                                                setFormActive(undefined);
                                            }}
                                            formActive={formActive}
                                            setFormActive={setFormActive}
                                        />
                                    ))}
                                    {!Object.entries(entries).length && (
                                        <TextColumn
                                            description={`No passwords found in file ${fileName}`}
                                        />
                                    )}
                                    {formActive === nextId && (
                                        <EntryForm
                                            onEncrypted={entry => {
                                                savePasswords(nextId, entry);
                                                setFormActive(undefined);
                                            }}
                                        />
                                    )}

                                    {!formActive && (
                                        <AddEntryButton onClick={() => setFormActive(nextId)} />
                                    )}
                                </PasswordsList>
                            </PasswordManagerBody>
                        ) : (
                            <div>
                                <div> no data</div>
                                <EntryForm
                                    onEncrypted={entry => {
                                        savePasswords(entry);
                                        // todo: get last id, this is not bulletproof (deleting etc)
                                        setFormActive(nextId);
                                    }}
                                />
                            </div>
                        )}
                    </>
                )}
            </SectionItem>
        </>
    );
};
