$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Version = '0.4.2'
$Root = $PSScriptRoot
$ExportDir = Join-Path $Root 'exports'
$ViewerData = Join-Path $Root 'viewer-data.js'
$ViewerHtml = Join-Path $Root 'viewer.html'

$AuthBase = 'https://ca.account.sony.com/api/authz/v3/oauth'
$AuthorizeUrl = "$AuthBase/authorize"
$TokenUrl = "$AuthBase/token"
$ClientId = '09515159-7237-4370-9b40-3806e67c0891'
$RedirectUri = 'com.scee.psxandroid.scecompcall://redirect'
$Scope = 'psn:mobile.v2.core psn:clientapp'
$BasicAuth = 'Basic MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A='
$OAuthUserAgent = 'com.sony.snei.np.android.sso.share.oauth.versa.USER_AGENT'
$MobileUserAgent = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36'
$EntitlementsUrl = 'https://m.np.playstation.com/api/entitlement/v2/users/me/internal/entitlements'
$Fields = 'titleMeta,gameMeta,conceptMeta,rewardMeta,rewardMeta.retentionPolicy,drmdef,drmdef.contentType,skuMeta,productMeta,cloudMeta,metarev,entitlementAttributes'

function Write-Step([string]$Text) {
    Write-Host "[PSDLE] $Text" -ForegroundColor Cyan
}

function Get-PlainText([Security.SecureString]$Secure) {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Clean-Npsso([string]$Value) {
    if ($null -eq $Value) { return '' }
    $v = $Value.Trim()
    if ($v.StartsWith('{')) {
        try {
            $obj = $v | ConvertFrom-Json
            if ($obj.npsso) { $v = [string]$obj.npsso }
        } catch { }
    }
    return $v.Trim().Trim('"').Trim("'")
}

function Encode-Query([System.Collections.IDictionary]$Parameters) {
    $parts = foreach ($entry in $Parameters.GetEnumerator()) {
        $k = [Uri]::EscapeDataString([string]$entry.Key)
        $v = [Uri]::EscapeDataString([string]$entry.Value)
        "$k=$v"
    }
    return ($parts -join '&')
}

function Get-HttpErrorText($ErrorRecord) {
    try {
        $resp = $ErrorRecord.Exception.Response
        if ($null -eq $resp) { return '' }
        $stream = $resp.GetResponseStream()
        if ($null -eq $stream) { return '' }
        $reader = New-Object IO.StreamReader($stream)
        try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
    } catch { return '' }
}

function Get-StatusCode($ErrorRecord) {
    try { return [int]$ErrorRecord.Exception.Response.StatusCode } catch { return 0 }
}

function New-CorrelationId {
    $mac = $null
    try {
        $nic = [Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
            Where-Object { $_.OperationalStatus -eq 'Up' -and $_.NetworkInterfaceType -ne 'Loopback' } |
            Select-Object -First 1
        if ($nic) { $mac = $nic.GetPhysicalAddress().ToString().ToLowerInvariant() }
    } catch { }
    if (-not $mac -or $mac.Length -ne 12) {
        $mac = ([Guid]::NewGuid().ToString('N')).Substring(20, 12)
    }
    return "00000000-0000-0000-0000-$mac"
}

function New-HttpClient([bool]$AllowRedirect = $false) {
    Add-Type -AssemblyName System.Net.Http -ErrorAction SilentlyContinue
    $handler = [System.Net.Http.HttpClientHandler]::new()
    $handler.AllowAutoRedirect = $AllowRedirect
    $handler.UseCookies = $false
    $client = [System.Net.Http.HttpClient]::new($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(45)
    return [pscustomobject]@{ Client = $client; Handler = $handler }
}

function Get-AuthorizationCode([string]$Npsso, [string]$Cid) {
    $params = [ordered]@{
        access_type = 'offline'
        cid = $Cid
        client_id = $ClientId
        device_base_font_size = '10'
        device_profile = 'mobile'
        elements_visibility = 'no_aclink'
        enable_scheme_error_code = 'true'
        no_captcha = 'true'
        PlatformPrivacyWs1 = 'minimal'
        redirect_uri = $RedirectUri
        response_type = 'code'
        scope = $Scope
        service_entity = 'urn:service-entity:psn'
        service_logo = 'ps'
        smcid = 'psapp:signin'
        support_scheme = 'sneiprls'
        turnOnTrustedBrowser = 'true'
        ui = 'pr'
    }
    $url = [Uri]::new(($AuthorizeUrl + '?' + (Encode-Query $params)), [UriKind]::Absolute)

    $bundle = New-HttpClient -AllowRedirect:$false
    $client = $bundle.Client
    $handler = $bundle.Handler
    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, $url)
    try {
        [void]$request.Headers.TryAddWithoutValidation('Cookie', "npsso=$Npsso")
        [void]$request.Headers.TryAddWithoutValidation('User-Agent', $MobileUserAgent)
        [void]$request.Headers.TryAddWithoutValidation('X-Requested-With', 'com.scee.psxandroid')
        [void]$request.Headers.TryAddWithoutValidation('Sec-Fetch-Dest', 'document')
        [void]$request.Headers.TryAddWithoutValidation('Sec-Fetch-Mode', 'navigate')
        [void]$request.Headers.TryAddWithoutValidation('Sec-Fetch-Site', 'same-site')
        [void]$request.Headers.TryAddWithoutValidation('Sec-Fetch-User', '?1')
        [void]$request.Headers.TryAddWithoutValidation('Accept-Language', 'en-US,en;q=0.9')
        [void]$request.Headers.TryAddWithoutValidation('Country', 'US')

        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        try {
            $status = [int]$response.StatusCode
            $location = $null
            if ($response.Headers.Location) { $location = $response.Headers.Location.OriginalString }
            if (-not $location -and $response.Headers.Contains('Location')) {
                    try {
                    $rawVals = $null
                    if ($response.Headers.TryGetValues('Location', [ref]$rawVals)) { $location = @($rawVals)[0] }
                } catch { }
            }
            $bodyText = ''
            try { $bodyText = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() } catch { }

            if ($location) {
                $location = [string]$location
                $codeMatch = [regex]::Match($location, '(?:[?&])code=([^&]+)')
                if ($codeMatch.Success) {
                    return [Uri]::UnescapeDataString($codeMatch.Groups[1].Value)
                }
                $errCode = [regex]::Match($location, '(?:[?&])error_code=([^&]+)')
                $errDesc = [regex]::Match($location, '(?:[?&])error_description=([^&]+)')
                if ($errCode.Success) {
                    $ec = [Uri]::UnescapeDataString($errCode.Groups[1].Value)
                    $ed = if ($errDesc.Success) { [Uri]::UnescapeDataString($errDesc.Groups[1].Value.Replace('+',' ')) } else { '' }
                    if ($ec -eq '4165') {
                        throw "Sony rejected the NPSSO (error 4165: not authenticated). Sign in again, open the NPSSO page again, and copy the NEW token."
                    }
                    throw "PlayStation authorization error $ec. $ed Redirect: $location"
                }
                throw "PlayStation authorization returned a redirect but no code. HTTP $status. Redirect: $location"
            }

            $snippet = ($bodyText -replace '\s+', ' ').Trim()
            if ($snippet.Length -gt 300) { $snippet = $snippet.Substring(0,300) + '...' }
            if ($status -eq 200) {
                throw "PlayStation returned HTTP 200 instead of an OAuth redirect. This usually means the NPSSO is not being accepted for this session. Response: $snippet"
            }
            throw "PlayStation authorization failed (HTTP $status). Response: $snippet"
        } finally {
            if ($response) { $response.Dispose() }
        }
    } catch {
        if ($_.Exception.Message -like 'PlayStation*' -or $_.Exception.Message -like 'Sony*') { throw }
        throw "PlayStation authorization request failed: $($_.Exception.Message)"
    } finally {
        $request.Dispose()
        $client.Dispose()
        $handler.Dispose()
    }
}

function Get-AccessToken([string]$Code, [string]$Cid) {
    $bundle = New-HttpClient -AllowRedirect:$false
    $client = $bundle.Client
    $handler = $bundle.Handler
    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Post, $TokenUrl)
    try {
        [void]$request.Headers.TryAddWithoutValidation('Authorization', $BasicAuth)
        [void]$request.Headers.TryAddWithoutValidation('X-Psn-Correlation-Id', $Cid)
        [void]$request.Headers.TryAddWithoutValidation('User-Agent', $OAuthUserAgent)
        [void]$request.Headers.TryAddWithoutValidation('Accept-Language', 'en-US,en;q=0.9')
        [void]$request.Headers.TryAddWithoutValidation('Country', 'US')

        $bodyParams = [ordered]@{
            cid = $Cid
            code = $Code
            grant_type = 'authorization_code'
            redirect_uri = $RedirectUri
            scope = $Scope
            token_format = 'jwt'
        }
        $encodedBody = Encode-Query $bodyParams
        $request.Content = [System.Net.Http.StringContent]::new($encodedBody, [Text.Encoding]::UTF8, 'application/x-www-form-urlencoded')
        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        try {
            $status = [int]$response.StatusCode
            $jsonText = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
            if (-not $response.IsSuccessStatusCode) {
                $snippet = ($jsonText -replace '\s+', ' ').Trim()
                if ($snippet.Length -gt 500) { $snippet = $snippet.Substring(0,500) + '...' }
                throw "PlayStation token exchange failed (HTTP $status). $snippet"
            }
            try { $obj = $jsonText | ConvertFrom-Json } catch { throw "Token response was not valid JSON: $jsonText" }
            if (-not $obj.access_token) { throw 'PlayStation token exchange returned no access token.' }
            return [string]$obj.access_token
        } finally {
            if ($response) { $response.Dispose() }
        }
    } catch {
        if ($_.Exception.Message -like 'PlayStation*' -or $_.Exception.Message -like 'Token*') { throw }
        throw "PlayStation token request failed: $($_.Exception.Message)"
    } finally {
        $request.Dispose()
        $client.Dispose()
        $handler.Dispose()
    }
}

function Get-Entitlements([string]$AccessToken) {
    $limit = 500
    $offset = 0
    $all = New-Object System.Collections.Generic.List[object]
    $revisionId = $null
    $metaRevisionId = $null
    $total = 0

    do {
        $url = $EntitlementsUrl + '?fields=' + [Uri]::EscapeDataString($Fields) + '&limit=' + $limit + '&offset=' + $offset
        try {
            $page = Invoke-RestMethod -Uri $url -Method Get -Headers @{ Authorization = "Bearer $AccessToken"; 'Accept-Language' = 'en-US,en;q=0.9'; Country = 'US' } -UserAgent $MobileUserAgent -ErrorAction Stop
        } catch {
            $status = Get-StatusCode $_
            $bodyText = Get-HttpErrorText $_
            throw "Entitlements request failed at offset $offset$(if($status){" (HTTP $status)"}). $bodyText"
        }

        if ($null -eq $revisionId) { $revisionId = $page.revisionId }
        if ($null -eq $metaRevisionId) { $metaRevisionId = $page.metaRevisionId }
        foreach ($item in @($page.entitlements)) {
            if ($null -ne $item) { [void]$all.Add($item) }
        }
        $total = [int]$page.totalResults
        $offset += $limit
        Write-Host "  fetched $($all.Count) / $total entitlements"
        if (@($page.entitlements).Count -eq 0) { break }
    } while ($offset -lt $total)

    return [pscustomobject]@{
        revisionId = $revisionId
        metaRevisionId = $metaRevisionId
        totalResults = $total
        entitlements = $all.ToArray()
    }
}

try {
    Write-Host ''
    Write-Host "PSDLE PS3 Modern Exporter v$Version" -ForegroundColor White
    Write-Host 'Uses your PlayStation account entitlement data. Your NPSSO and OAuth token are not saved.' -ForegroundColor DarkGray
    Write-Host ''
    Write-Host '1. Sign in to https://www.playstation.com/ in your browser.'
    Write-Host '2. In the same browser open: https://ca.account.sony.com/api/v1/ssocookie'
    Write-Host '3. Copy the npsso value. Treat it like a password.'
    Write-Host ''

    $secure = Read-Host 'Paste your NPSSO value (hidden)' -AsSecureString
    $npsso = Clean-Npsso (Get-PlainText $secure)
    if (-not $npsso) { throw 'No NPSSO token was entered.' }

    $cid = New-CorrelationId
    Write-Step 'Requesting PlayStation authorization code...'
    $code = Get-AuthorizationCode -Npsso $npsso -Cid $cid

    Write-Step 'Exchanging authorization code for access token...'
    $accessToken = Get-AccessToken -Code $code -Cid $cid

    Write-Step 'Fetching PlayStation entitlements...'
    $raw = Get-Entitlements -AccessToken $accessToken

    if (-not (Test-Path $ExportDir)) { New-Item -ItemType Directory -Path $ExportDir | Out-Null }
    $stamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
    $rawPath = Join-Path $ExportDir "psn-entitlements-$stamp.json"
    $rawJson = $raw | ConvertTo-Json -Depth 100
    [IO.File]::WriteAllText($rawPath, $rawJson, (New-Object Text.UTF8Encoding($false)))

    $compactJson = $raw | ConvertTo-Json -Depth 100 -Compress
    $viewerJs = "window.PSDLE_RAW = $compactJson;"
    [IO.File]::WriteAllText($ViewerData, $viewerJs, (New-Object Text.UTF8Encoding($false)))

    Write-Host ''
    Write-Host "Saved raw entitlement data to:`n$rawPath" -ForegroundColor Green
    Write-Step 'Opening PS3 library viewer...'
    Start-Process $ViewerHtml
    Write-Host ''
    Write-Host 'The viewer filters strict PS3 DRM entries (platformIds=2147483648, downloadType=0).' -ForegroundColor DarkGray
    Write-Host 'Use the viewer buttons to export PS3 CSV or JSON.' -ForegroundColor DarkGray
    Write-Host ''
} catch {
    Write-Host ''
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ''
    exit 1
}
