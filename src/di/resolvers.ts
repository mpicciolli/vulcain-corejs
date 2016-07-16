import {Scope} from './scope';
import {Container} from './containers';

export interface IContainer {
    injectInstance(fn, name: string): IContainer;
    injectSingleton(fn, ...args): IContainer;
    injectSingleton(fn, name?: string, ...args): IContainer;
    injectSingleton(fn, nameOrArray: string | Array<any>, ...args): IContainer;
    injectTransient(fn, ...args): IContainer;
    injectTransient(fn, name?: string, ...args): IContainer;
    injectTransient(fn, nameOrArray: string | Array<any>, ...args): IContainer;
    injectScoped(fn, ...args): IContainer;
    injectScoped(fn, name?: string, ...args): IContainer;
    injectScoped(fn, nameOrArray: string | Array<any>, ...args): IContainer;
    get(name: string, optional?: boolean);
    resolve(fn, ...args);
    dispose();
}

export interface IResolver {
    resolve(container: Container, name?: string);
}

export class InstanceResolver implements IResolver
{
    constructor(private instance) {}

    resolve(container: Container, name?: string) {
        return this.instance;
    }
}

export class Resolver implements IResolver {
    static nb:number = 0;

    constructor(private fn, private args?:Array<any>, public scoped?:boolean) {}

    resolve(container: Container, name?: string) {
        let injects;
        try {injects = Reflect.getMetadata(Symbol.for("di:injects"), this.fn);} catch(e) {}
        let params = [];

        if(injects) {
            for(var inject in injects) {
                let info = injects[inject];
                params.push( container.get(info.name, info.optional))
            }
        }

        if(this.args) {
            this.args.forEach(a=> {
                params.push(a);
            });
        }

        let component = invoke(this.fn, params);
        component._id = Resolver.nb++;
        return component;
    }
}

export class SingletonResolver extends Resolver
{
    constructor(fn, args?:Array<any>) {
        super(fn, args);
    }

    resolve(container: Container, name?: string) {
        let instance = name && container.scope.get(name);
        if (!instance) {
            instance = super.resolve(container, name);
            if(name && instance)
                container.scope.set(name, instance);
        }
        return instance;
    }
}

function invoke(fn, args) {
    switch(args.length) {
        case 0: return new fn();
        case 1: return new fn(args[0])
        case 2: return new fn(args[0],args[1])
        case 3: return new fn(args[0],args[1],args[2])
        case 4: return new fn(args[0],args[1],args[2],args[3])
        case 5: return new fn(args[0],args[1],args[2],args[3],args[4])
        case 6: return new fn(args[0],args[1],args[2],args[3],args[4], args[5])
        case 7: return new fn(args[0],args[1],args[2],args[3],args[4], args[5], args[6])
        default:
          return Reflect.construct(fn, args);
    }
}