/**
 * Bridge runner
 */
import { TrezordNode } from '@trezor/transport-bridge';

import { app, ipcMain } from '../typed-electron';
import { BridgeProcess } from '../libs/processes/BridgeProcess';
import { b2t } from '../libs/utils';

import type { Module, Dependencies } from './index';

const bridgeLegacy = app.commandLine.hasSwitch('bridge-legacy');
const bridgeLegacyDev = app.commandLine.hasSwitch('bridge-legacy-dev');
const bridgeLegacyTest = app.commandLine.hasSwitch('bridge-legacy-test');
// bridge node is intended for internal testing
const bridgeTest = app.commandLine.hasSwitch('bridge-test');
const bridgeDev = app.commandLine.hasSwitch('bridge-dev');

export const SERVICE_NAME = 'bridge';

const handleBridgeStatus = async (
    bridge: BridgeProcess | TrezordNode,
    mainWindow: Dependencies['mainWindow'],
) => {
    const { logger } = global;

    logger.info('bridge', `Getting status`);
    const status = await bridge.status();
    logger.info('bridge', `Toggling bridge. Status: ${JSON.stringify(status)}`);

    mainWindow.webContents.send('bridge/status', status);

    return status;
};

const start = async (bridge: BridgeProcess | TrezordNode) => {
    if (bridgeLegacy) {
        await bridge.start();
    } else if (bridgeLegacyDev) {
        await bridge.startDev();
    } else if (bridgeLegacyTest) {
        await bridge.startTest();
    } else {
        await bridge.start();
    }
};

const getBridgeInstance = () => {
    if (bridgeLegacy || bridgeLegacyDev || bridgeLegacyTest) {
        return new BridgeProcess();
    }

    return new TrezordNode({ port: 21325, api: bridgeDev || bridgeTest ? 'udp' : 'usb' });
};

const load = async ({ store, mainWindow }: Dependencies) => {
    const { logger } = global;
    const bridge = getBridgeInstance();

    app.on('before-quit', () => {
        logger.info(SERVICE_NAME, 'Stopping (app quit)');
        bridge.stop();
    });

    ipcMain.handle('bridge/toggle', async (_: unknown) => {
        const status = await handleBridgeStatus(bridge, mainWindow);
        try {
            if (status.service) {
                await bridge.stop();
                store.setBridgeSettings({ startOnStartup: false });
            } else {
                await start(bridge);
                store.setBridgeSettings({ startOnStartup: true });
            }

            return { success: true };
        } catch (error) {
            return { success: false, error };
        } finally {
            handleBridgeStatus(bridge, mainWindow);
        }
    });

    ipcMain.handle('bridge/get-status', async () => {
        try {
            const status = await bridge.status();

            return { success: true, payload: status };
        } catch (error) {
            return { success: false, error };
        }
    });

    if (!store.getBridgeSettings().startOnStartup) {
        return;
    }

    try {
        logger.info(
            SERVICE_NAME,
            `Starting (Legacy dev: ${b2t(bridgeLegacyDev)}), Legacy test: ${b2t(bridgeLegacyTest)}), Legacy: ${b2t(bridgeLegacy)}, Test: ${b2t(bridgeTest)}`,
        );
        await start(bridge);
        handleBridgeStatus(bridge, mainWindow);
    } catch (err) {
        logger.error(SERVICE_NAME, `Start failed: ${err.message}`);
    }
};

export const init: Module = dependencies => {
    let loaded = false;

    return () => {
        if (loaded) return;
        loaded = true;
        // TODO intentionally not awaited to mimic previous behavior, resolve later!
        load(dependencies);
    };
};
