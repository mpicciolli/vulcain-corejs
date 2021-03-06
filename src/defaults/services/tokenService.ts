import { Injectable, LifeTime } from '../../di/annotations';
import { ITokenService } from '../services';
import { Conventions } from '../../utils/conventions';
var jwt = require('jsonwebtoken');

@Injectable(LifeTime.Singleton)
export class TokenService implements ITokenService {

    private issuer: string;
    // https://github.com/auth0/node-jsonwebtoken
    private secretKey: string;
    // https://github.com/rauchg/ms.js
    private tokenExpiration: string;

    constructor() {
        this.issuer = process.env[Conventions.instance.ENV_TOKEN_ISSUER];
        this.tokenExpiration = process.env[Conventions.instance.ENV_TOKEN_EXPIRATION] || Conventions.instance.defaultTokenExpiration;
        this.secretKey = process.env[Conventions.instance.ENV_VULCAIN_SECRET_KEY] || Conventions.instance.defaultSecretKey;
    }

    verifyTokenAsync(jwtToken): Promise<any> {
        return new Promise(async (resolve, reject) => {
            if (!jwtToken) {
                reject("You must provided a valid token");
                return;
            }
            let options: any = { "issuer": this.issuer || "vulcain" };

            try {
                let key = this.secretKey;
                //options.algorithms=[ALGORITHM];

                jwt.verify(jwtToken, key, options, (err, payload) => {
                    if (err)
                        reject(err);
                    else
                        resolve(payload.value);
                });
            }
            catch (err) {
                reject({ error: err, message: "Invalid JWT token" });
            }
        });
    }
}
