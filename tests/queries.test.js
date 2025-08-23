jest.mock('../db/prisma', () => ({
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
    folder: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
    },
    file: {
        create: jest.fn(),
    },
}));

const db = require('../db/prisma');
const queries = require('../db/queries');

describe('db/queries.js', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('getUserByEmail returns user by email', async () => {
        const email = 'john@example.com';
        const user = { id: 1, email };
        db.user.findUnique.mockResolvedValue(user);

        const result = await queries.getUserByEmail(email);

        expect(db.user.findUnique).toHaveBeenCalledWith({ where: { email } });
        expect(result).toEqual(user);
    });

    test('getUserById returns user by id', async () => {
        const id = 1;
        const user = { id, email: 'john@example.com' };
        db.user.findUnique.mockResolvedValue(user);

        const result = await queries.getUserById(id);

        expect(db.user.findUnique).toHaveBeenCalledWith({ where: { id } });
        expect(result).toEqual(user);
    });

    test('isEmailTaken true when user exists', async () => {
        const email = 'taken@example.com';
        db.user.findUnique.mockResolvedValue({ id: 1, email });

        const taken = await queries.isEmailTaken(email);

        expect(db.user.findUnique).toHaveBeenCalledWith({ where: { email } });
        expect(taken).toBe(true);
    });

    test('isEmailTaken false when user not found', async () => {
        const email = 'free@example.com';
        db.user.findUnique.mockResolvedValue(null);

        const taken = await queries.isEmailTaken(email);

        expect(taken).toBe(false);
    });

    test('createUser inserts a user', async () => {
        const name = 'John';
        const email = 'john@example.com';
        const password = 'hashed';
        const created = { id: 1, name, email };
        db.user.create.mockResolvedValue(created);

        const result = await queries.createUser(name, email, password);

        expect(db.user.create).toHaveBeenCalledWith({
            data: { name, email, password },
        });
        expect(result).toEqual(created);
    });

    test('createUserFolder creates default folder for user email', async () => {
        const email = 'john@example.com';
        const user = { id: 42, email };
        db.user.findUnique.mockResolvedValue(user);

        await queries.createUserFolder(email);

        expect(db.user.findUnique).toHaveBeenCalledWith({ where: { email } });
        expect(db.folder.create).toHaveBeenCalledWith({
            data: { name: 'Default Folder', ownerId: user.id },
        });
    });

    test('getTopLevelFolders returns folders with parentId null', async () => {
        const email = 'john@example.com';
        const user = { id: 7, email };
        const folders = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
        db.user.findUnique.mockResolvedValue(user);
        db.folder.findMany.mockResolvedValue(folders);

        const result = await queries.getTopLevelFolders(email);

        expect(db.folder.findMany).toHaveBeenCalledWith({
            where: { ownerId: user.id, parentId: null },
        });
        expect(result).toEqual(folders);
    });

    test('getFoldersAndFilesByParentId returns folder + children + files', async () => {
        const folderId = 10;
        const userId = 3;
        const folder = {
            id: folderId,
            children: [{ id: 11 }, { id: 12 }],
            files: [{ id: 21 }, { id: 22 }],
        };

        db.folder.findUnique.mockResolvedValue(folder);

        const result = await queries.getFoldersAndFilesByParentId(folderId, userId);

        expect(db.folder.findUnique).toHaveBeenCalledWith({
            where: { ownerId: userId, id: Number(folderId) },
            include: {
                children: { where: { ownerId: userId } },
                files: { where: { ownerId: userId } },
                _count: { select: { children: true, files: true } },
            },
        });
        expect(result).toEqual({
            folder,
            folders: folder.children,
            files: folder.files,
        });
    });

    test('createFolder creates dashboard folder when params is null', async () => {
        const folderName = 'Root';
        const userId = 9;
        const created = { id: 100, name: folderName, ownerId: userId };
        db.folder.create.mockResolvedValue(created);

        const result = await queries.createFolder(folderName, userId, null);

        expect(db.folder.create).toHaveBeenCalledWith({
            data: { name: folderName, ownerId: userId },
        });
        expect(result).toEqual(created);
    });

    test('createFolder creates child folder when params has id', async () => {
        const folderName = 'Child';
        const userId = 9;
        const params = { id: '55' };
        const created = { id: 101, name: folderName, ownerId: userId, parentId: 55 };
        db.folder.create.mockResolvedValue(created);

        const result = await queries.createFolder(folderName, userId, params);

        expect(db.folder.create).toHaveBeenCalledWith({
            data: { name: folderName, ownerId: userId, parentId: Number(params.id) },
        });
        expect(result).toEqual(created);
    });

    test('uploadFile validates inputs and creates file', async () => {
        const file = {
            originalname: 'a.jpg',
            size: 123,
            mimetype: 'image/jpeg',
            path: '/uploads/a-123.jpg',
        };
        const folderId = '77';
        const user = { id: 1 };
        const created = { id: 500, name: file.originalname };
        db.file.create.mockResolvedValue(created);

        const result = await queries.uploadFile(file, folderId, user);

        expect(db.file.create).toHaveBeenCalledWith({
            data: {
                name: file.originalname,
                size: file.size,
                type: file.mimetype,
                localPath: file.path,
                cloudUrl: '<cloud_url>',
                folderId: Number(folderId),
                ownerId: user.id,
            },
        });
        expect(result).toEqual(created);
    });

    test('uploadFile throws when inputs are invalid', async () => {
        await expect(queries.uploadFile(null, null, null)).rejects.toThrow('Invalid file, folderId or user');
    });

    test('deleteFolder deletes by id and ownerId', async () => {
        const folderId = '44';
        const userId = 2;
        db.folder.delete.mockResolvedValue({ id: Number(folderId) });

        await queries.deleteFolder(folderId, userId);

        expect(db.folder.delete).toHaveBeenCalledWith({
            where: { id: Number(folderId), ownerId: userId },
        });
    });

    test('getParentFolderIdByChildrenId returns parentId', async () => {
        const folderId = '66';
        const userId = 3;
        db.folder.findFirst.mockResolvedValue({ parentId: 10 });

        const result = await queries.getParentFolderIdByChildrenId(folderId, userId);

        expect(db.folder.findFirst).toHaveBeenCalledWith({
            where: { id: Number(folderId), ownerId: userId },
            select: { parentId: true },
        });
        expect(result).toBe(10);
    });

    test('getParentFolderIdByChildrenId returns null when not found', async () => {
        const folderId = '77';
        const userId = 3;
        db.folder.findFirst.mockResolvedValue(null);

        const result = await queries.getParentFolderIdByChildrenId(folderId, userId);

        expect(result).toBeNull();
    });
});