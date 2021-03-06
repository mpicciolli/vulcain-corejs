import {Schema} from '../../schemas/schema';
import {IProvider} from '../../providers/provider';
import {DefaultServiceNames} from '../../di/annotations';
import {IContainer} from '../../di/resolvers';
import {Domain} from '../../schemas/schema';
import {Inject} from '../../di/annotations';
import { IMetrics } from '../../metrics/metrics';
import { ProviderFactory } from '../../providers/providerFactory';
import { RequestContext } from '../../servers/requestContext';

/**
 *
 *
 * @export
 * @abstract
 * @class AbstractCommand
 * @template T
 */
export abstract class AbstractProviderCommand<T> {

    private providerFactory: ProviderFactory;

    protected metrics: IMetrics;

    /**
     *
     *
     * @type {RequestContext}
     */
    public requestContext: RequestContext;

    get container() {
        return this.requestContext.container;
    }
    /**
     *
     *
     * @type {IProvider<T>}
     */
    provider: IProvider<T>;
    /**
     *
     *
     * @type {Schema}
     */
    schema: Schema;

    private static METRICS_NAME = "Database_Call_";

    /**
     * Creates an instance of AbstractCommand.
     *
     * @param {IContainer} container
     * @param {any} providerFactory
     */
    constructor(
        @Inject(DefaultServiceNames.Container) container: IContainer) {
        this.providerFactory = container.get<ProviderFactory>(DefaultServiceNames.ProviderFactory);
        this.metrics = container.get<IMetrics>(DefaultServiceNames.Metrics);
    }

    /**
     *
     *
     * @param {string} schema
     */
    async setSchemaAsync(schema: string): Promise<any> {
        if (schema && !this.provider) {
            this.schema = this.container.get<Domain>(DefaultServiceNames.Domain).getSchema(schema);
            this.provider = await this.providerFactory.getProviderAsync(this.requestContext.container, this.requestContext.tenant, this.schema);
            this.initializeMetricsInfo();
        }
    }

    protected initializeMetricsInfo() {
        this.metrics.setTags("uri=" + this.provider.address, "schema="+this.schema.name);
    }

    onCommandCompleted(duration: number, success: boolean) {
        if (this.schema && this.provider) {
            this.metrics.timing(AbstractProviderCommand.METRICS_NAME + "Duration", duration);
            this.metrics.increment(AbstractProviderCommand.METRICS_NAME + "Total");
            if (!success)
                this.metrics.increment(AbstractProviderCommand.METRICS_NAME + "Failed");
        }
    }

    /**
     * execute command
     * @protected
     * @abstract
     * @param {any} args
     * @returns {Promise<T>}
     */
    abstract runAsync(...args): Promise<T>;

    // Must be defined in command
   // protected fallbackAsync(err, ...args)
}
