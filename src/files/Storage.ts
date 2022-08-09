import { IStorage } from '../global';
import { File } from './File';

export class Storage extends File {
    readonly data: IStorage;

    private static readonly defaultData: IStorage = {knownArticles: {}};

    constructor() {
        super(File.getPath('storage.json'), Storage.defaultData);

        this.data = super.load() as IStorage;

        // Write current config (+ missing default values) into file
        this.save();
    }

    getData(): object {
        return this.data;
    }
}