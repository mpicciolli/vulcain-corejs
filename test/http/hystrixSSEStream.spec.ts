import { HystrixSSEStream } from "../../dist/commands/http/HystrixSSEStream";
import { CommandFactory } from '../../dist/commands/command/commandFactory';
import { CommandProperties } from "../../dist/commands/command/commandProperties";
import { CommandMetricsFactory } from "../../dist/commands/metrics/commandMetricsFactory";
import { AbstractCommand } from '../../dist/commands/command/abstractCommand';
import { Command } from '../../dist/commands/command/commandFactory';
import { TestContainer } from '../../dist/di/containers';

@Command()
export class HystrixSSECommand1 extends AbstractCommand<any> {
    runAsync(args) {
        return new Promise((resolve, reject) => {
            setTimeout(function () {
                resolve(args);
            }, 200);
        });
    }
}

let container = new TestContainer("Test");

describe("HystrixSSEStream", function () {

    async function executeCommand(commandKey) {
        let command = await CommandFactory.getAsync(commandKey, container.scope.requestContext);
        command.executeAsync("success");
    }

    it("should poll metrics every second", function (done) {
        executeCommand("HystrixSSECommand1");
        executeCommand("HystrixSSECommand1");

        setTimeout(function () {
            executeCommand("HystrixSSECommand1");
            let stream = HystrixSSEStream.toObservable(500);
            let subscription = stream.subscribe(
                function (next) {
                    subscription.dispose();
                    done();
                }
            );
        }, 1001);
    });
});